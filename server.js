import fs from 'fs';
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import cors from 'cors';
import chokidar from 'chokidar';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import {
  getAllTasks,
  updateTask,
  createTask,
  promoteTask,
  approveAgentTask,
  syncObsidianDashboard,
  associateEmailToProject,
  getProjectCorrespondence
} from './vaultParser.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const VAULT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const ACTIVE_PROJECTS_DIR = path.join(VAULT_ROOT, '1.active_projects');

// Serve static vault assets safely
app.use('/api/vault-assets', express.static(VAULT_ROOT));

// Serve static React web app build
const DIST_DIR = path.resolve(SCRIPT_DIR, 'dist');
app.use(express.static(DIST_DIR));

// Telemetry execution on startup per vault standard
function runTelemetry() {
  const telemetryScript = path.join(VAULT_ROOT, '3.scripts', 'telemetry.py');
  exec(`py "${telemetryScript}" task_dashboard_server`, (err, stdout, stderr) => {
    if (err) {
      console.log('Telemetry logged (or fallback executed):', stderr || err.message);
    } else {
      console.log('Telemetry status:', stdout.trim());
    }
  });
}
runTelemetry();

// HTTP REST API Routes
app.get('/api/tasks', (req, res) => {
  try {
    const includeArchive = req.query.includeArchive === 'true';
    const tasks = getAllTasks(includeArchive);
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Automated debounced Git auto-sync queue with targeted staging
let gitSyncTimer = null;
let pendingSyncPaths = new Set();

let syncState = {
  status: 'synced', // 'synced' | 'syncing' | 'error'
  lastSync: new Date().toISOString(),
  error: null
};

function broadcastSyncStatus() {
  const data = JSON.stringify({ type: 'SYNC_STATUS', syncState });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function scheduleGitSync(targetPaths = [], delayMs = 8000) {
  if (Array.isArray(targetPaths)) {
    targetPaths.forEach((p) => p && pendingSyncPaths.add(p));
  } else if (targetPaths) {
    pendingSyncPaths.add(targetPaths);
  }

  if (gitSyncTimer) clearTimeout(gitSyncTimer);
  gitSyncTimer = setTimeout(() => {
    const pathsToSync = Array.from(pendingSyncPaths);
    pendingSyncPaths.clear();

    const pathArgs = pathsToSync.length > 0 
      ? pathsToSync.map((p) => `"${p}"`).join(' ') 
      : '';
    console.log(`🔄 Triggering automated Git sync for paths: ${pathsToSync.length > 0 ? pathsToSync.join(', ') : 'all'}`);
    
    syncState.status = 'syncing';
    broadcastSyncStatus();

    const syncScript = path.join(VAULT_ROOT, '3.scripts', 'sync_vault.py');
    const cmd = `py "${syncScript}" "Auto-sync: Vault updates from Task Bridge" ${pathArgs}`;
    
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        syncState.status = 'error';
        syncState.error = stderr || err.message;
        console.error('[Git Sync] Error during auto-sync:', stderr || err.message);
      } else {
        syncState.status = 'synced';
        syncState.lastSync = new Date().toISOString();
        syncState.error = null;
        console.log('[Git Sync] Auto-sync complete:', stdout.trim());
      }
      broadcastSyncStatus();
    });
  }, delayMs);
}

// Sync Status Endpoint
app.get('/api/sync-status', (req, res) => {
  res.json({ success: true, syncState });
});

// Force Sync Retry
app.post('/api/sync-vault/retry', (req, res) => {
  scheduleGitSync(['1.active_projects'], 0);
  res.json({ success: true, message: 'Sync triggered' });
});

// In-memory cache for archived projects to ensure sub-10ms response times
let cachedArchivedProjects = null;
let lastArchivedScan = 0;
const ARCHIVE_CACHE_TTL = 120000; // 2 minutes

// Archived Projects Endpoint
app.get('/api/projects/archived', (req, res) => {
  try {
    const now = Date.now();
    if (cachedArchivedProjects && (now - lastArchivedScan < ARCHIVE_CACHE_TTL)) {
      return res.json({ success: true, archivedProjects: cachedArchivedProjects });
    }

    const archivedProjects = [];
    const seen = new Set();

    // 1. Check 1.active_projects/_archive
    const activeArchiveDir = path.join(ACTIVE_PROJECTS_DIR, '_archive');
    if (fs.existsSync(activeArchiveDir)) {
      const items = fs.readdirSync(activeArchiveDir);
      for (const item of items) {
        const full = path.join(activeArchiveDir, item);
        const name = item.replace(/\.md$/, '');
        if (!seen.has(name)) {
          seen.add(name);
          archivedProjects.push({ name, path: full, location: '_archive' });
        }
      }
    }

    // 2. Scan 1.records for archived projects (read first 1KB only for maximum speed)
    const recordsDir = path.join(VAULT_ROOT, '1.records');
    if (fs.existsSync(recordsDir)) {
      const categories = fs.readdirSync(recordsDir);
      for (const cat of categories) {
        const catDir = path.join(recordsDir, cat);
        if (fs.statSync(catDir).isDirectory() && !cat.startsWith('_') && cat !== 'daily') {
          const files = fs.readdirSync(catDir);
          for (const f of files) {
            if (f.endsWith('.md')) {
              const full = path.join(catDir, f);
              try {
                const fd = fs.openSync(full, 'r');
                const buf = Buffer.alloc(1024);
                const bytesRead = fs.readSync(fd, buf, 0, 1024, 0);
                fs.closeSync(fd);
                const head = buf.toString('utf8', 0, bytesRead);
                if (/^type:\s*["']?Project/m.test(head) || /status:\s*["']?completed/m.test(head)) {
                  const name = f.replace(/\.md$/, '');
                  if (!seen.has(name)) {
                    seen.add(name);
                    archivedProjects.push({ name, path: full, location: `1.records/${cat}` });
                  }
                }
              } catch (e) {}
            }
          }
        }
      }
    }

    cachedArchivedProjects = archivedProjects;
    lastArchivedScan = now;
    res.json({ success: true, archivedProjects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reactivate Archived Project
app.post('/api/projects/reactivate', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Missing project name' });

    const targetActiveDir = path.join(ACTIVE_PROJECTS_DIR, name);
    if (!fs.existsSync(targetActiveDir)) {
      fs.mkdirSync(targetActiveDir, { recursive: true });
    }

    const projectMdPath = path.join(targetActiveDir, 'project.md');
    if (!fs.existsSync(projectMdPath)) {
      const content = `---\ntype: Project\ntitle: "${name} Project"\nstatus: active\nreactivated_at: ${new Date().toISOString()}\n---\n\n# ${name} Project\n\n## Tasks\n`;
      fs.writeFileSync(projectMdPath, content, 'utf8');
    } else {
      let current = fs.readFileSync(projectMdPath, 'utf8');
      current = current.replace(/status:\s*["']?[^"'\n]+["']?/i, 'status: active');
      fs.writeFileSync(projectMdPath, current, 'utf8');
    }

    cachedArchivedProjects = null; // Invalidate cache on reactivation
    broadcastVaultUpdate();
    scheduleGitSync([path.join('1.active_projects', name)]);
    res.json({ success: true, message: `Project ${name} reactivated` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to check if an email thread is already triaged into a task or associated with correspondence
app.get('/api/tasks/check-duplicate', (req, res) => {
  try {
    const { email_ref, subject } = req.query;
    if (!email_ref && !subject) return res.json({ exists: false });

    // Normalize email_ref for comparison (extract thread ID)
    const normalizeRef = (url) => {
      if (!url) return '';
      const match = url.match(/([a-zA-Z0-9_\-]{16,})/);
      if (match) return match[1];
      const endMatch = url.match(/([a-zA-Z0-9_\-]+)$/);
      return endMatch ? endMatch[1] : url.toLowerCase();
    };

    const targetId = email_ref ? normalizeRef(email_ref) : null;
    const cleanSubj = subject ? subject.toLowerCase().replace(/^(?:re|fwd|fw):\s*/i, '').trim() : '';

    const tasks = getAllTasks();
    const match = tasks.find((t) => {
      if (targetId && t.email_ref && normalizeRef(t.email_ref) === targetId) return true;
      if (cleanSubj && t.title) {
        const tTitle = t.title.toLowerCase().replace(/^(?:re|fwd|fw):\s*/i, '').trim();
        if (tTitle === cleanSubj) return true;
      }
      return false;
    });

    if (match) {
      return res.json({
        exists: true,
        isCorrespondence: false,
        task: {
          id: match.id,
          title: match.title,
          project: match.project,
          status: match.status
        }
      });
    }

    // Check project correspondence across active projects
    if (fs.existsSync(ACTIVE_PROJECTS_DIR)) {
      const dirs = fs.readdirSync(ACTIVE_PROJECTS_DIR);
      for (const d of dirs) {
        if (d.startsWith('.') || d === 'node_modules' || d === '_archive') continue;
        const fullDir = path.join(ACTIVE_PROJECTS_DIR, d);
        if (fs.statSync(fullDir).isDirectory()) {
          const corresp = getProjectCorrespondence(d);
          const correspMatch = corresp.find((c) => {
            if (targetId && normalizeRef(c.threadUrl || c.url) === targetId) return true;
            if (cleanSubj && c.subject && c.subject.toLowerCase().trim() === cleanSubj) return true;
            return false;
          });
          if (correspMatch) {
            return res.json({
              exists: true,
              isCorrespondence: true,
              task: {
                title: correspMatch.subject,
                project: d,
                status: 'associated'
              }
            });
          }
        }
      }
    }

    res.json({ exists: false });
  } catch (err) {
    res.status(500).json({ exists: false, error: err.message });
  }
});

const handleTaskUpdate = async (req, res) => {
  try {
    const { id, updates } = req.body;
    if (!id || !updates) return res.status(400).json({ success: false, error: 'Missing id or updates' });
    await updateTask(id, updates);
    broadcastVaultUpdate();
    scheduleGitSync(['1.active_projects']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.post('/api/tasks/update', handleTaskUpdate);
app.patch('/api/tasks', handleTaskUpdate);

app.post('/api/tasks/create', async (req, res) => {
  try {
    await createTask(req.body);
    broadcastVaultUpdate();
    scheduleGitSync([path.join('1.active_projects', req.body.project || 'General')]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint for Chrome Extension: Create Task from Email
app.post('/api/tasks/create-from-email', async (req, res) => {
  try {
    const {
      title,
      project,
      priority = 'medium',
      due = null,
      assignee = null,
      email_ref = null,
      email_sender = null,
      email_snippet = null,
      log_correspondence = true
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Missing required field: title' });
    }

    const targetProject = project || 'General';
    await createTask({
      title,
      project: targetProject,
      priority,
      due,
      assignee,
      isAtomic: true,
      email_ref,
      email_sender,
      email_snippet,
      log_correspondence
    });

    broadcastVaultUpdate();
    scheduleGitSync([path.join('1.active_projects', targetProject)]);
    res.json({ success: true, message: 'Task successfully created from email' });
  } catch (err) {
    console.error('Error in /api/tasks/create-from-email:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint for Chrome Extension: Associate Email with Project Correspondence
app.post('/api/projects/associate-email', async (req, res) => {
  try {
    const { project, subject, sender, threadUrl, date } = req.body;
    if (!project || !subject || !threadUrl) {
      return res.status(400).json({ success: false, error: 'Missing required fields (project, subject, threadUrl)' });
    }

    const targetProject = project || 'General';
    await associateEmailToProject({ project: targetProject, subject, sender, threadUrl, date });
    broadcastVaultUpdate();
    scheduleGitSync([path.join('1.active_projects', targetProject, 'project.md')]);
    res.json({ success: true, message: 'Email successfully associated with project' });
  } catch (err) {
    console.error('Error in /api/projects/associate-email:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to fetch correspondence for a specific project
app.get('/api/projects/:name/correspondence', (req, res) => {
  try {
    const correspondence = getProjectCorrespondence(req.params.name);
    res.json({ success: true, correspondence });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/promote', async (req, res) => {
  try {
    const { id } = req.body;
    await promoteTask(id);
    broadcastVaultUpdate();
    scheduleGitSync();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/approve-agent', async (req, res) => {
  try {
    const { id } = req.body;
    await approveAgentTask(id);
    broadcastVaultUpdate();
    scheduleGitSync();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/projects', (req, res) => {
  try {
    const tasks = getAllTasks();
    const projectMap = {};

    // First scan active_projects directory for existing folders
    if (fs.existsSync(ACTIVE_PROJECTS_DIR)) {
      const dirs = fs.readdirSync(ACTIVE_PROJECTS_DIR);
      for (const d of dirs) {
        const fullPath = path.join(ACTIVE_PROJECTS_DIR, d);
        if (fs.statSync(fullPath).isDirectory() && !d.startsWith('.')) {
          projectMap[d] = { name: d, total: 0, completed: 0, highPriority: 0 };
        }
      }
    }

    if (!projectMap['General']) {
      projectMap['General'] = { name: 'General', total: 0, completed: 0, highPriority: 0 };
    }

    tasks.forEach((t) => {
      const p = t.project || 'General';
      if (!projectMap[p]) {
        projectMap[p] = { name: p, total: 0, completed: 0, highPriority: 0 };
      }
      projectMap[p].total++;
      if (t.status === 'done') projectMap[p].completed++;
      if (t.priority === 'high' && t.status !== 'done') projectMap[p].highPriority++;
    });

    res.json({ success: true, projects: Object.values(projectMap) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Setup HTTP & WebSockets
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcastVaultUpdate() {
  const tasks = getAllTasks();
  const data = JSON.stringify({ type: 'VAULT_UPDATED', tasks });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// File system watcher with debounce
let debounceTimer = null;
const watcher = chokidar.watch(ACTIVE_PROJECTS_DIR, {
  ignored: [
    /(^|[\/\\])\../,
    /node_modules/,
    /__pycache__/,
    /predictionarb[\/\\](code[\/\\]\.venv|memory|data)/,
    /dashboard\.md$/,
    /Agent_Queue\.md$/
  ],
  persistent: true,
  ignoreInitial: true
});

watcher.on('all', (event, filePath) => {
  if (filePath.endsWith('.md')) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`[Watcher] File change detected (${event}): ${filePath}`);
      broadcastVaultUpdate();
    }, 300);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Task Dashboard Backend Server running on http://localhost:${PORT}`);
  syncObsidianDashboard();
});
