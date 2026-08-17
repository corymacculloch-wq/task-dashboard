import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import cors from 'cors';
import chokidar from 'chokidar';
import { exec } from 'child_process';
import {
  getAllTasks,
  refreshVaultCache,
  updateTask,
  createTask,
  promoteTask,
  undoPromoteTask,
  approveAgentTask,
  syncObsidianDashboard,
  getProjectDetail,
  updateProjectDetail
} from './vaultParser.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Disable browser caching for development assets
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const VAULT_ROOT = process.env.VAULT_ROOT ? path.resolve(process.env.VAULT_ROOT) : path.resolve('C:/Users/corym/Vault');
const ACTIVE_PROJECTS_DIR = path.join(VAULT_ROOT, '1.active_projects');

// Serve static vault assets safely
app.use('/api/vault-assets', express.static(VAULT_ROOT));

// Serve static React web app build
const DIST_DIR = path.join(__dirname, 'dist');
app.use(express.static(DIST_DIR));

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.path.startsWith('/assets')) {
    return res.status(404).send('Asset not found');
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Telemetry execution on startup per vault standard
function runTelemetry() {
  const telemetryScript = path.join(VAULT_ROOT, '3.scripts', 'telemetry.py');
  exec(`py "${telemetryScript}" task_dashboard_server`, { timeout: 5000 }, (err, stdout, stderr) => {
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

app.post('/api/tasks/update', async (req, res) => {
  try {
    const { id, updates } = req.body;
    if (!id || !updates) return res.status(400).json({ success: false, error: 'Missing id or updates' });
    await updateTask(id, updates);
    broadcastVaultUpdate();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/create', async (req, res) => {
  try {
    await createTask(req.body);
    broadcastVaultUpdate();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/promote', async (req, res) => {
  try {
    const { id } = req.body;
    await promoteTask(id);
    broadcastVaultUpdate();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/undo-promote', async (req, res) => {
  try {
    const { id } = req.body;
    await undoPromoteTask(id);
    broadcastVaultUpdate();
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/projects', (req, res) => {
  try {
    const tasks = getAllTasks();
    const projectMap = {};

    tasks.forEach((t) => {
      if (!projectMap[t.project]) {
        projectMap[t.project] = { name: t.project, total: 0, completed: 0, highPriority: 0 };
      }
      projectMap[t.project].total++;
      if (t.status === 'done') projectMap[t.project].completed++;
      if (t.priority === 'high' && t.status !== 'done') projectMap[t.project].highPriority++;
    });

    const sortedProjects = Object.values(projectMap).sort((a, b) => {
      if (a.name === 'General') return -1;
      if (b.name === 'General') return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    res.json({ success: true, projects: sortedProjects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/projects/detail', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ success: false, error: 'Project name is required' });
    const detail = await getProjectDetail(name);
    res.json({ success: true, project: detail });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/projects/update-detail', async (req, res) => {
  try {
    const { name, updates } = req.body;
    if (!name || !updates) return res.status(400).json({ success: false, error: 'Missing name or updates' });
    const result = await updateProjectDetail(name, updates);
    broadcastVaultUpdate();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('error', (err) => {
  console.log('WebSocket server notice:', err.message);
});

async function broadcastVaultUpdate() {
  const tasks = await refreshVaultCache();
  const data = JSON.stringify({ type: 'VAULT_UPDATED', tasks });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

let debounceTimer = null;
const watcher = chokidar.watch(ACTIVE_PROJECTS_DIR, {
  ignored: (p, stats) => {
    if (stats && stats.isDirectory()) {
      const base = path.basename(p);
      return base.startsWith('.') || base === 'node_modules' || base === 'dist';
    }
    if (!p.endsWith('.md')) return true;
    const base = path.basename(p);
    return base === 'dashboard.md' || base === 'Agent_Queue.md' || base === 'weekly_review_latest.md';
  },
  persistent: true,
  ignoreInitial: true,
  usePolling: true,
  interval: 5000,
  ignorePermissionErrors: true
});

watcher.on('error', (err) => {
  console.log('[Watcher Notice] Handled watcher notice:', err.message);
});

watcher.on('all', (event, filePath) => {
  if (filePath.endsWith('.md')) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log(`[Watcher] File change detected (${event}): ${filePath}`);
      await broadcastVaultUpdate();
    }, 500);
  }
});

async function startServer() {
  console.log('Pre-warming vault task cache...');
  await refreshVaultCache();
  syncObsidianDashboard();

  let currentPort = parseInt(PORT, 10);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${currentPort} is busy. Trying port ${currentPort + 1}...`);
      currentPort += 1;
      setTimeout(() => {
        server.close();
        server.listen(currentPort, '0.0.0.0');
      }, 500);
    } else {
      console.error('Server error:', err.message);
    }
  });

  server.listen(currentPort, '0.0.0.0', () => {
    console.log(`🚀 Task Dashboard Backend Server running on http://localhost:${currentPort}`);
  });
}

startServer();

// Keep process alive
setInterval(() => {}, 30000);
