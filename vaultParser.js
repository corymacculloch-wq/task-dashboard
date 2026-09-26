import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const VAULT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const ACTIVE_PROJECTS_DIR = path.join(VAULT_ROOT, '1.active_projects');
const ARCHIVE_DIR = path.join(VAULT_ROOT, '1.records', 'Archive', 'Tasks');
const DASHBOARD_MD_PATH = path.join(ACTIVE_PROJECTS_DIR, 'dashboard.md');
const AGENT_QUEUE_MD_PATH = path.join(ACTIVE_PROJECTS_DIR, 'Agent_Queue.md');

// Safe file write with exponential backoff retries for Google Drive EPERM locks
export async function writeFileWithRetry(filePath, content, maxRetries = 5, initialDelay = 100) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (err) {
      if (err.code === 'EPERM' || err.code === 'EBUSY') {
        attempt++;
        if (attempt >= maxRetries) throw err;
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

// Lightweight zero-dependency YAML frontmatter parser
function parseYamlFrontmatter(text) {
  const obj = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > -1) {
      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
      }
      obj[key] = value;
    }
  }
  return obj;
}

// Lightweight zero-dependency YAML frontmatter serializer
function stringifyYamlFrontmatter(obj) {
  let yaml = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      yaml += `${k}: [${v.map((item) => `"${item}"`).join(', ')}]\n`;
    } else if (typeof v === 'string' && (v.includes(':') || v.includes('#') || v.includes('"') || v.trim() !== v)) {
      yaml += `${k}: "${v.replace(/"/g, '\\"')}"\n`;
    } else {
      yaml += `${k}: ${v}\n`;
    }
  }
  return yaml;
}

// Utility to recursively find files in directory
function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.startsWith('.') || file === 'node_modules' || file === '__pycache__' || file === 'venv') {
      continue;
    }
    const filePath = path.join(dir, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getFilesRecursively(filePath, fileList);
      } else if (file.endsWith('.md')) {
        fileList.push(filePath);
      }
    } catch (e) {}
  }
  return fileList;
}

// Parse YAML frontmatter and body
function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(frontmatterRegex);

  if (match) {
    try {
      const frontmatter = parseYamlFrontmatter(match[1]);
      const body = content.slice(match[0].length);
      return { frontmatter, body, rawContent: content };
    } catch (e) {
      return { frontmatter: null, body: content, rawContent: content };
    }
  }
  return { frontmatter: null, body: content, rawContent: content };
}

// Extract inline tasks matching `- [ ] Task description [priority:: high] [due:: YYYY-MM-DD] [assignee:: cory]`
function parseInlineTasks(filePath, project) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const tasks = [];

  const relPath = path.relative(ACTIVE_PROJECTS_DIR, filePath).replace(/\\/g, '/');

  lines.forEach((line, index) => {
    const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      const isDone = taskMatch[2].toLowerCase() === 'x';
      let rawText = taskMatch[3];

      let priority = 'medium';
      const priorityMatch = rawText.match(/\[priority::\s*([^\]]+)\]/i);
      if (priorityMatch) priority = priorityMatch[1].trim().toLowerCase();

      let due = null;
      const dueMatch = rawText.match(/\[due::\s*([^\]]+)\]/i);
      if (dueMatch) due = dueMatch[1].trim();

      let assignee = null;
      const assigneeMatch = rawText.match(/\[assignee::\s*([^\]]+)\]/i);
      if (assigneeMatch) assignee = assigneeMatch[1].trim().toLowerCase();

      let taskRef = null;
      const refMatch = rawText.match(/<!--\s*task-ref:\s*([^>\s]+)\s*-->/i);
      if (refMatch) taskRef = refMatch[1];

      let gtaskId = null;
      const gtaskMatch = rawText.match(/<!--\s*gtask-id:\s*([^>\s]+)\s*-->/i);
      if (gtaskMatch) gtaskId = gtaskMatch[1];

      let emailRef = null;
      const emailMatch = rawText.match(/<!--\s*email-ref:\s*([^>\s]+)\s*-->/i);
      if (emailMatch) emailRef = emailMatch[1];

      let cleanTitle = rawText
        .replace(/\[priority::\s*[^\]]+\]/gi, '')
        .replace(/\[due::\s*[^\]]+\]/gi, '')
        .replace(/\[assignee::\s*[^\]]+\]/gi, '')
        .replace(/<!--\s*task-ref:\s*[^>]+\s*-->/gi, '')
        .replace(/<!--\s*gtask-id:\s*[^>]+\s*-->/gi, '')
        .replace(/<!--\s*email-ref:\s*[^>]+\s*-->/gi, '')
        .trim();

      const taskId = `inline:${relPath}:${index}`;

      tasks.push({
        id: taskId,
        isAtomic: false,
        title: cleanTitle,
        status: isDone ? 'done' : 'todo',
        priority,
        due,
        assignee,
        project: project || path.basename(path.dirname(filePath)),
        parent_plan: relPath,
        filePath,
        lineIndex: index,
        taskRef,
        gtaskId,
        email_ref: emailRef,
        rawLine: line
      });
    }
  });

  return tasks;
}

// Scans vault for all tasks
export function getAllTasks(includeArchive = false) {
  const activeFiles = getFilesRecursively(ACTIVE_PROJECTS_DIR);
  let filesToScan = [...activeFiles];

  if (includeArchive && fs.existsSync(ARCHIVE_DIR)) {
    const archiveFiles = getFilesRecursively(ARCHIVE_DIR);
    filesToScan.push(...archiveFiles);
  }

  const tasks = [];
  const atomicTaskRefs = new Set();

  // First pass: Collect atomic tasks
  for (const filePath of filesToScan) {
    const baseName = path.basename(filePath);
    if (baseName.startsWith('task-') && baseName.endsWith('.md')) {
      const { frontmatter, body } = parseMarkdownFile(filePath);
      if (frontmatter && frontmatter.type === 'Task') {
        const relPath = path.relative(ACTIVE_PROJECTS_DIR, filePath).replace(/\\/g, '/');
        const project = frontmatter.project || path.basename(path.dirname(filePath));
        atomicTaskRefs.add(baseName);
        atomicTaskRefs.add(relPath);
        tasks.push({
          id: `atomic:${relPath}`,
          isAtomic: true,
          title: frontmatter.title || baseName.replace(/^task-|\.md$/g, ''),
          description: frontmatter.description || '',
          status: frontmatter.status || 'todo',
          priority: (frontmatter.priority || 'medium').toLowerCase(),
          due: frontmatter.due || null,
          assignee: (frontmatter.assignee || '').toLowerCase() || null,
          project,
          parent_plan: frontmatter.parent_plan || 'project.md',
          filePath,
          body,
          frontmatter,
          email_ref: frontmatter.email_ref || null,
          email_sender: frontmatter.email_sender || null,
          email_snippet: frontmatter.email_snippet || null,
          gtaskId: frontmatter.gtask_id || null
        });
      }
    }
  }

  // Second pass: Collect inline tasks, filtering out duplicate taskRef pointers to atomic task files
  for (const filePath of filesToScan) {
    const baseName = path.basename(filePath);
    if (!baseName.startsWith('task-') || !baseName.endsWith('.md')) {
      if (baseName !== 'dashboard.md' && baseName !== 'Agent_Queue.md' && baseName !== 'weekly_review_latest.md') {
        const project = path.basename(path.dirname(filePath));
        const inlineTasks = parseInlineTasks(filePath, project);
        for (const t of inlineTasks) {
          if (t.taskRef) {
            const refBase = path.basename(t.taskRef);
            if (atomicTaskRefs.has(refBase)) {
              continue; // Deduplicate: Atomic task file already represents this item
            }
          }
          tasks.push(t);
        }
      }
    }
  }

  return tasks;
}

// Update task in file
export async function updateTask(taskId, updates) {
  if (taskId.startsWith('atomic:')) {
    const relPath = taskId.replace('atomic:', '');
    const filePath = path.join(ACTIVE_PROJECTS_DIR, relPath);
    if (!fs.existsSync(filePath)) throw new Error(`Atomic task file not found: ${filePath}`);

    const { frontmatter, body } = parseMarkdownFile(filePath);
    if (!frontmatter) throw new Error(`Invalid frontmatter in ${filePath}`);

    const oldProject = frontmatter.project || path.basename(path.dirname(filePath));
    const newProject = updates.project && updates.project !== oldProject ? updates.project : null;

    if (updates.status !== undefined) frontmatter.status = updates.status;
    if (updates.priority !== undefined) frontmatter.priority = updates.priority;
    if (updates.title !== undefined) frontmatter.title = updates.title;
    if (updates.description !== undefined) frontmatter.description = updates.description;
    if (updates.due !== undefined) frontmatter.due = updates.due;
    if (updates.assignee !== undefined) frontmatter.assignee = updates.assignee;
    if (updates.email_ref !== undefined) frontmatter.email_ref = updates.email_ref || null;
    if (updates.email_sender !== undefined) frontmatter.email_sender = updates.email_sender || null;
    if (updates.email_snippet !== undefined) frontmatter.email_snippet = updates.email_snippet || null;

    if (newProject) {
      frontmatter.project = newProject;
      if (Array.isArray(frontmatter.tags)) {
        frontmatter.tags = frontmatter.tags.filter((t) => t.toLowerCase() !== oldProject.toLowerCase());
        if (!frontmatter.tags.includes(newProject.toLowerCase())) {
          frontmatter.tags.push(newProject.toLowerCase());
        }
      }
    }
    frontmatter.processed_at = new Date().toISOString().slice(0, 19) + 'Z';

    if (newProject) {
      const newProjectDir = path.join(ACTIVE_PROJECTS_DIR, newProject);
      if (!fs.existsSync(newProjectDir)) {
        fs.mkdirSync(newProjectDir, { recursive: true });
      }
      let targetFileName = path.basename(filePath);
      let targetFilePath = path.join(newProjectDir, targetFileName);

      // Collision guard: if targetFilePath already exists and is not the current file
      if (fs.existsSync(targetFilePath) && targetFilePath !== filePath) {
        const ext = path.extname(targetFileName);
        const nameWithoutExt = path.basename(targetFileName, ext);
        let counter = 1;
        while (fs.existsSync(path.join(newProjectDir, `${nameWithoutExt}-${counter}${ext}`))) {
          counter++;
        }
        targetFileName = `${nameWithoutExt}-${counter}${ext}`;
        targetFilePath = path.join(newProjectDir, targetFileName);
      }

      // Clear obsolete gtask_id so it can be re-synced cleanly to target project task list
      if (frontmatter.gtask_id) {
        delete frontmatter.gtask_id;
      }

      const newContent = `---\n${stringifyYamlFrontmatter(frontmatter)}---\n${body}`;
      await writeFileWithRetry(targetFilePath, newContent);

      if (fs.existsSync(filePath) && targetFilePath !== filePath) {
        fs.unlinkSync(filePath);
      }

      // Remove inline task-ref from old project.md
      const oldParentPath = path.join(path.dirname(filePath), frontmatter.parent_plan || 'project.md');
      if (fs.existsSync(oldParentPath)) {
        const oldContent = fs.readFileSync(oldParentPath, 'utf8');
        const oldFileName = path.basename(filePath);
        const filteredLines = oldContent
          .split(/\r?\n/)
          .filter((line) => !line.includes(oldFileName));
        await writeFileWithRetry(oldParentPath, filteredLines.join('\n'));
      }

      // Add inline task-ref into new project.md
      const newProjectMdPath = path.join(newProjectDir, 'project.md');
      let inlineItem = `- [${frontmatter.status === 'done' ? 'x' : ' '}] ${frontmatter.title} [priority:: ${frontmatter.priority}]`;
      if (frontmatter.due) inlineItem += ` [due:: ${frontmatter.due}]`;
      if (frontmatter.assignee) inlineItem += ` [assignee:: ${frontmatter.assignee}]`;
      if (frontmatter.email_ref) inlineItem += ` <!-- email-ref: ${frontmatter.email_ref} -->`;
      inlineItem += ` <!-- task-ref: ./${targetFileName} -->`;

      if (fs.existsSync(newProjectMdPath)) {
        const curr = fs.readFileSync(newProjectMdPath, 'utf8');
        await writeFileWithRetry(newProjectMdPath, curr.trimEnd() + '\n' + inlineItem + '\n');
      } else {
        const initProject = `---\ntype: "Project"\ntitle: "${newProject} Project"\nstatus: "active"\n---\n\n# ${newProject} Project\n\n## Tasks\n${inlineItem}\n`;
        await writeFileWithRetry(newProjectMdPath, initProject);
      }
    } else {
      const newContent = `---\n${stringifyYamlFrontmatter(frontmatter)}---\n${body}`;
      await writeFileWithRetry(filePath, newContent);

      if (frontmatter.parent_plan) {
        const parentPath = path.join(path.dirname(filePath), frontmatter.parent_plan);
        if (fs.existsSync(parentPath)) {
          await syncInlineTaskFromAtomic(parentPath, baseName(filePath), frontmatter.status === 'done');
        }
      }
    }
  } else if (taskId.startsWith('inline:')) {
    const parts = taskId.split(':');
    const relPath = parts[1];
    const lineIndex = parseInt(parts[2], 10);
    const filePath = path.join(ACTIVE_PROJECTS_DIR, relPath);

    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    if (lineIndex >= lines.length) throw new Error(`Line index out of range: ${lineIndex}`);

    let line = lines[lineIndex];

    const currentProject = path.basename(path.dirname(filePath));
    const newProject = updates.project && updates.project !== currentProject ? updates.project : null;

    if (updates.status !== undefined) {
      const mark = updates.status === 'done' ? 'x' : ' ';
      line = line.replace(/^(\s*-\s*\[)[ xX](\])/, `$1${mark}$2`);
    }

    if (updates.priority !== undefined) {
      if (/\[priority::\s*[^\]]+\]/i.test(line)) {
        line = line.replace(/\[priority::\s*[^\]]+\]/i, `[priority:: ${updates.priority}]`);
      } else {
        line += ` [priority:: ${updates.priority}]`;
      }
    }

    if (updates.assignee !== undefined) {
      if (/\[assignee::\s*[^\]]+\]/i.test(line)) {
        line = line.replace(/\[assignee::\s*[^\]]+\]/i, `[assignee:: ${updates.assignee}]`);
      } else {
        line += ` [assignee:: ${updates.assignee}]`;
      }
    }

    if (updates.due !== undefined) {
      if (/\[due::\s*[^\]]+\]/i.test(line)) {
        line = line.replace(/\[due::\s*[^\]]+\]/i, `[due:: ${updates.due}]`);
      } else if (updates.due) {
        line += ` [due:: ${updates.due}]`;
      }
    }

    if (updates.email_ref !== undefined) {
      if (/<!--\s*email-ref:\s*[^>]+\s*-->/i.test(line)) {
        if (updates.email_ref) {
          line = line.replace(/<!--\s*email-ref:\s*[^>]+\s*-->/i, `<!-- email-ref: ${updates.email_ref} -->`);
        } else {
          line = line.replace(/<!--\s*email-ref:\s*[^>]+\s*-->/i, '').trim();
        }
      } else if (updates.email_ref) {
        line += ` <!-- email-ref: ${updates.email_ref} -->`;
      }
    }

    if (newProject) {
      // Remove inline task from old file
      lines.splice(lineIndex, 1);
      await writeFileWithRetry(filePath, lines.join('\n'));

      // Clean out old gtask-id reference before relocating to new project
      line = line.replace(/<!--\s*gtask-id:\s*[^>]+\s*-->/i, '').trim();

      // Add to new project.md
      const newProjectDir = path.join(ACTIVE_PROJECTS_DIR, newProject);
      if (!fs.existsSync(newProjectDir)) {
        fs.mkdirSync(newProjectDir, { recursive: true });
      }
      const newProjectMdPath = path.join(newProjectDir, 'project.md');
      if (fs.existsSync(newProjectMdPath)) {
        const curr = fs.readFileSync(newProjectMdPath, 'utf8');
        await writeFileWithRetry(newProjectMdPath, curr.trimEnd() + '\n' + line + '\n');
      } else {
        const initProject = `---\ntype: "Project"\ntitle: "${newProject} Project"\nstatus: "active"\n---\n\n# ${newProject} Project\n\n## Tasks\n${line}\n`;
        await writeFileWithRetry(newProjectMdPath, initProject);
      }
    } else {
      lines[lineIndex] = line;
      await writeFileWithRetry(filePath, lines.join('\n'));
    }
  }

  await syncObsidianDashboard();
  return true;
}

// Sync inline task checkbox when atomic task changes status
async function syncInlineTaskFromAtomic(parentPath, atomicFileName, isDone) {
  if (!fs.existsSync(parentPath)) return;
  const content = fs.readFileSync(parentPath, 'utf8');
  const lines = content.split(/\r?\n/);
  let updated = false;

  const newLines = lines.map((line) => {
    if (line.includes(atomicFileName)) {
      const mark = isDone ? 'x' : ' ';
      updated = true;
      return line.replace(/^(\s*-\s*\[)[ xX](\])/, `$1${mark}$2`);
    }
    return line;
  });

  if (updated) {
    await writeFileWithRetry(parentPath, newLines.join('\n'));
  }
}

function baseName(p) {
  return path.basename(p);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Create Task (Atomic or Inline)
export async function createTask(taskData) {
  const {
    title,
    description,
    project,
    priority = 'medium',
    due = null,
    assignee = null,
    isAtomic = true,
    email_ref = null,
    email_sender = null,
    email_snippet = null,
    log_correspondence = false
  } = taskData;
  const targetProject = project || 'General';
  const projectDir = path.join(ACTIVE_PROJECTS_DIR, targetProject);

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().slice(0, 19) + 'Z';

  let fileName = null;
  let filePath = null;

  if (isAtomic) {
    const baseSlug = slugify(title) || 'task';
    fileName = `task-${baseSlug}.md`;
    filePath = path.join(projectDir, fileName);
    let counter = 1;

    // Filename collision guard: prevent overwriting existing notes
    while (fs.existsSync(filePath)) {
      counter++;
      fileName = `task-${baseSlug}-${counter}.md`;
      filePath = path.join(projectDir, fileName);
    }

    const frontmatter = {
      type: 'Task',
      title,
      description: description || title,
      resource: 'NA',
      tags: ['task', targetProject.toLowerCase()],
      timestamp,
      processed_at: timestamp,
      sha256: 'NA',
      status: 'todo',
      project: targetProject,
      parent_plan: 'project.md',
      priority
    };
    if (due) frontmatter.due = due;
    if (assignee) frontmatter.assignee = assignee;
    if (email_ref) frontmatter.email_ref = email_ref;
    if (email_sender) frontmatter.email_sender = email_sender;
    if (email_snippet) frontmatter.email_snippet = email_snippet;

    let notesBody = `* Task created via Task Dashboard UI.\n`;
    if (email_ref) {
      notesBody = `* **Email Thread**: [${title}](${email_ref})\n* **From**: ${email_sender || 'Unknown'}\n\n> ${email_snippet || 'No email snippet preview.'}\n`;
    }

    const content = `---\n${stringifyYamlFrontmatter(frontmatter)}---\n\n## Notes & Execution Steps\n\n${notesBody}`;
    await writeFileWithRetry(filePath, content);

    const projectMdPath = path.join(projectDir, 'project.md');
    let inlineItem = `- [ ] ${title} [priority:: ${priority}]`;
    if (due) inlineItem += ` [due:: ${due}]`;
    if (assignee) inlineItem += ` [assignee:: ${assignee}]`;
    if (email_ref) inlineItem += ` <!-- email-ref: ${email_ref} -->`;
    inlineItem += ` <!-- task-ref: ./${fileName} -->\n`;

    if (fs.existsSync(projectMdPath)) {
      const current = fs.readFileSync(projectMdPath, 'utf8');
      await writeFileWithRetry(projectMdPath, current + '\n' + inlineItem);
    } else {
      const initProject = `---\ntype: "Project"\ntitle: "${targetProject} Project"\nstatus: "active"\n---\n\n# ${targetProject} Project\n\n## Tasks\n${inlineItem}`;
      await writeFileWithRetry(projectMdPath, initProject);
    }
  } else {
    const projectMdPath = path.join(projectDir, 'project.md');
    let inlineItem = `- [ ] ${title} [priority:: ${priority}]`;
    if (due) inlineItem += ` [due:: ${due}]`;
    if (assignee) inlineItem += ` [assignee:: ${assignee}]`;
    if (email_ref) inlineItem += ` <!-- email-ref: ${email_ref} -->`;

    if (fs.existsSync(projectMdPath)) {
      const current = fs.readFileSync(projectMdPath, 'utf8');
      await writeFileWithRetry(projectMdPath, current + '\n' + inlineItem + '\n');
    } else {
      const initProject = `---\ntype: "Project"\ntitle: "${targetProject} Project"\nstatus: "active"\n---\n\n# ${targetProject} Project\n\n## Tasks\n${inlineItem}\n`;
      await writeFileWithRetry(projectMdPath, initProject);
    }
  }

  if (email_ref && log_correspondence) {
    try {
      await associateEmailToProject({
        project: targetProject,
        subject: title,
        sender: email_sender || 'Unknown',
        threadUrl: email_ref,
        date: timestamp.slice(0, 10)
      });
    } catch (e) {
      console.warn('Could not auto-log email correspondence:', e);
    }
  }

  await syncObsidianDashboard();
  return { success: true, fileName: isAtomic ? fileName : null, filePath: isAtomic ? filePath : null };
}

// Associate email to project correspondence log
export async function associateEmailToProject({ project, subject, sender, threadUrl, date }) {
  const targetProject = project || 'General';
  const projectDir = path.join(ACTIVE_PROJECTS_DIR, targetProject);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  const projectMdPath = path.join(projectDir, 'project.md');
  const entryDate = date || new Date().toISOString().slice(0, 10);
  const logEntry = `- [${entryDate}] [${subject}](${threadUrl}) — From: ${sender || 'Unknown'}\n`;

  if (fs.existsSync(projectMdPath)) {
    let current = fs.readFileSync(projectMdPath, 'utf8');
    if (/##.*Correspondence/i.test(current)) {
      current = current.replace(/(##.*Correspondence[^\n]*\n)/i, `$1${logEntry}`);
    } else {
      current += `\n\n## Correspondence\n\n${logEntry}`;
    }
    await writeFileWithRetry(projectMdPath, current);
  } else {
    const initProject = `---\ntype: "Project"\ntitle: "${targetProject} Project"\nstatus: "active"\n---\n\n# ${targetProject} Project\n\n## Correspondence\n\n${logEntry}\n## Tasks\n`;
    await writeFileWithRetry(projectMdPath, initProject);
  }

  await syncObsidianDashboard();
  return { success: true };
}

// Get all correspondence entries for a project
export function getProjectCorrespondence(projectName) {
  const projectDir = path.join(ACTIVE_PROJECTS_DIR, projectName);
  const projectMdPath = path.join(projectDir, 'project.md');
  if (!fs.existsSync(projectMdPath)) return [];

  const content = fs.readFileSync(projectMdPath, 'utf8');
  const match = content.match(/##.*Correspondence([\s\S]*?)(?=\n##|$)/i);
  if (!match) return [];

  const lines = match[1].split(/\r?\n/);
  const entries = [];
  for (const line of lines) {
    const itemMatch = line.match(/^-\s*\[([^\]]+)\]\s*\[(.+)\]\((https?:\/\/[^)]+)\)\s*(?:—\s*From:\s*(.*))?$/);
    if (itemMatch) {
      entries.push({
        date: itemMatch[1],
        subject: itemMatch[2],
        url: itemMatch[3],
        threadUrl: itemMatch[3],
        sender: itemMatch[4]?.trim() || 'Unknown'
      });
    }
  }
  return entries;
}

// Promote Inline Task to Atomic File per SOP
export async function promoteTask(taskId) {
  if (!taskId.startsWith('inline:')) throw new Error('Only inline tasks can be promoted.');

  const allTasks = getAllTasks();
  const task = allTasks.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found.');

  const slug = slugify(task.title);
  const fileName = `task-${slug}.md`;
  const projectDir = path.dirname(task.filePath);
  const filePath = path.join(projectDir, fileName);
  const timestamp = new Date().toISOString().slice(0, 19) + 'Z';

  const frontmatter = {
    type: 'Task',
    title: task.title,
    description: task.title,
    resource: 'NA',
    tags: ['task', task.project.toLowerCase()],
    timestamp,
    processed_at: timestamp,
    sha256: 'NA',
    status: task.status,
    project: task.project,
    parent_plan: path.basename(task.filePath),
    priority: task.priority
  };
  if (task.due) frontmatter.due = task.due;
  if (task.assignee) frontmatter.assignee = task.assignee;
  if (task.gtaskId) frontmatter.gtask_id = task.gtaskId;

  const atomicContent = `---\n${stringifyYamlFrontmatter(frontmatter)}---\n\n## Notes & Promoted Context\n\n* Promoted from inline task in \`${path.basename(task.filePath)}\`.\n`;
  await writeFileWithRetry(filePath, atomicContent);

  const content = fs.readFileSync(task.filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  let line = lines[task.lineIndex];

  if (!line.includes('<!-- task-ref:')) {
    line += ` <!-- task-ref: ./${fileName} -->`;
  }
  lines[task.lineIndex] = line;
  await writeFileWithRetry(task.filePath, lines.join('\n'));

  await syncObsidianDashboard();
  return true;
}

// Approve Agent Candidate Task
export async function approveAgentTask(taskId) {
  const allTasks = getAllTasks();
  const task = allTasks.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found');

  await updateTask(taskId, { assignee: 'agent', status: 'doing' });

  const timestamp = new Date().toISOString().slice(0, 19) + 'Z';
  const entry = `\n### 🤖 Agent Task Approved [${timestamp}]\n- **Title**: ${task.title}\n- **Project**: ${task.project}\n- **Task Ref**: \`${taskId}\`\n- **Status**: Ready for execution\n`;

  let currentQueue = '';
  if (fs.existsSync(AGENT_QUEUE_MD_PATH)) {
    currentQueue = fs.readFileSync(AGENT_QUEUE_MD_PATH, 'utf8');
  } else {
    currentQueue = `# 🤖 Active Agent Execution Queue\n\nList of tasks explicitly approved for autonomous AI execution.\n`;
  }

  await writeFileWithRetry(AGENT_QUEUE_MD_PATH, currentQueue + entry);
  await syncObsidianDashboard();
  return true;
}

function adjustLinksForDashboard(title, sourceFilePath) {
  if (!sourceFilePath || !title) return title;
  const sourceDir = path.dirname(sourceFilePath);
  return title.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, target) => {
    if (
      target.startsWith('http://') ||
      target.startsWith('https://') ||
      target.startsWith('mailto:') ||
      target.startsWith('#')
    ) {
      return match;
    }
    const absTarget = path.resolve(sourceDir, target);
    const relToDashboard = path.relative(ACTIVE_PROJECTS_DIR, absTarget).replace(/\\/g, '/');
    return `[${label}](${relToDashboard})`;
  });
}

// Auto-regenerate 1.active_projects/dashboard.md to keep Obsidian aligned
export async function syncObsidianDashboard() {
  try {
    const tasks = getAllTasks();
    const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    let md = `---\ntype: "Dashboard"\ntitle: "Unified Daily Cockpit"\nupdated: "${nowStr}"\ntags: [dashboard, tasks, active-projects]\n---\n\n# 🎯 Unified Daily Cockpit\n> *Last Refreshed: ${nowStr}* | Auto-generated from active projects.\n\n⚙️ **Direct Controls**: [Google Tasks Web App](https://calendar.google.com/calendar/r/tasks)\n\n---\n\n## 🚨 Overdue & Due Today\n\n`;

    const todayStr = new Date().toISOString().slice(0, 10);
    const dueTodayOrOverdue = activeTasks.filter((t) => t.due && t.due <= todayStr);

    if (dueTodayOrOverdue.length === 0) {
      md += `*No active items.*\n\n`;
    } else {
      md += `| ✔️ | Task | Project | Due Date | Priority |\n| :---: | :--- | :--- | :---: | :---: |\n`;
      dueTodayOrOverdue.forEach((t) => {
        let title = adjustLinksForDashboard(t.title, t.filePath).replace(/\|/g, '\\|');
        const proj = (t.project || 'General').replace(/\|/g, '\\|');
        if (t.email_ref) title += ` [✉️](${t.email_ref})`;
        md += `| [ ] | ${title} | ${proj} | ${t.due} | ${t.priority} |\n`;
      });
      md += `\n`;
    }

    md += `---\n\n## 🤖 Agent Candidate Work Queue\n> [!NOTE]\n> **Human-in-the-Loop Policy**: Agent tasks require explicit user approval before execution.\n\n`;

    const agentTasks = activeTasks.filter((t) => t.assignee === 'agent');
    if (agentTasks.length === 0) {
      md += `*No active items.*\n\n`;
    } else {
      md += `| ✔️ | Task | Project | Priority | Status |\n| :---: | :--- | :--- | :---: | :---: |\n`;
      agentTasks.forEach((t) => {
        let title = adjustLinksForDashboard(t.title, t.filePath).replace(/\|/g, '\\|');
        const proj = (t.project || 'General').replace(/\|/g, '\\|');
        if (t.email_ref) title += ` [✉️](${t.email_ref})`;
        md += `| [ ] | ${title} | ${proj} | ${t.priority} | ${t.status} |\n`;
      });
      md += `\n`;
    }

    md += `---\n\n## 🔥 High Priority Focus\n\n`;
    const highPriority = activeTasks.filter((t) => t.priority === 'high');
    if (highPriority.length === 0) {
      md += `*No active items.*\n\n`;
    } else {
      md += `| ✔️ | Task | Project | Due Date | Assignee |\n| :---: | :--- | :--- | :---: | :---: |\n`;
      highPriority.forEach((t) => {
        let title = adjustLinksForDashboard(t.title, t.filePath).replace(/\|/g, '\\|');
        const proj = (t.project || 'General').replace(/\|/g, '\\|');
        if (t.email_ref) title += ` [✉️](${t.email_ref})`;
        md += `| [ ] | ${title} | ${proj} | ${t.due || '—'} | ${t.assignee || '—'} |\n`;
      });
      md += `\n`;
    }

    md += `---\n\n## 📂 Master Active Projects Checklist\n\n| ✔️ | Task | Project | Priority | Due Date | Assignee | Source / Sync |\n| :---: | :--- | :--- | :---: | :---: | :---: | :---: |\n`;

    activeTasks.forEach((t) => {
      const syncParts = [];
      if (t.email_ref) syncParts.push(`[✉️ Gmail](${t.email_ref})`);
      if (t.gtaskId) syncParts.push(`[🔗 GTasks](https://calendar.google.com/calendar/r/tasks)`);
      const syncDisplay = syncParts.length > 0 ? syncParts.join(' ') : '—';
      const title = adjustLinksForDashboard(t.title, t.filePath).replace(/\|/g, '\\|');
      const proj = (t.project || 'General').replace(/\|/g, '\\|');
      md += `| [ ] | ${title} | ${proj} | ${t.priority} | ${t.due || '—'} | ${t.assignee || '—'} | ${syncDisplay} |\n`;
    });

    await writeFileWithRetry(DASHBOARD_MD_PATH, md);
  } catch (err) {
    console.error('Error syncing Obsidian dashboard:', err);
  }
}
