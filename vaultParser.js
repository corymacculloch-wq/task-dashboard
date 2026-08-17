import fs from 'fs';
import path from 'path';

const VAULT_ROOT = process.env.VAULT_ROOT ? path.resolve(process.env.VAULT_ROOT) : path.resolve('C:/Users/corym/Vault');
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

function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

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

      let description = '';
      const descMatch = rawText.match(/\[description::\s*([^\]]+)\]/i);
      if (descMatch) description = descMatch[1].trim();

      let completed = null;
      const completedMatch = rawText.match(/\[completed::\s*([^\]]+)\]/i);
      if (completedMatch) completed = completedMatch[1].trim();

      let taskRef = null;
      const refMatch = rawText.match(/<!--\s*task-ref:\s*([^>\s]+)\s*-->/i);
      if (refMatch) taskRef = refMatch[1];

      let gtaskId = null;
      const gtaskMatch = rawText.match(/<!--\s*gtask-id:\s*([^>\s]+)\s*-->/i);
      if (gtaskMatch) gtaskId = gtaskMatch[1];

      let projectOverride = null;
      const projectMatch = rawText.match(/\[project::\s*([^\]]+)\]/i);
      if (projectMatch) projectOverride = projectMatch[1].trim();

      let projectVal = projectOverride || project || path.basename(path.dirname(filePath));
      if (['CoworkMemory', 'cowork-memory-backup', 'KB Business', 'Kinbots Development'].includes(projectVal)) {
        projectVal = 'ACTIVE_KINBOTS';
      }

      let cleanTitle = rawText
        .replace(/\[priority::\s*[^\]]+\]/gi, '')
        .replace(/\[due::\s*[^\]]+\]/gi, '')
        .replace(/\[assignee::\s*[^\]]+\]/gi, '')
        .replace(/\[project::\s*[^\]]+\]/gi, '')
        .replace(/\[description::\s*[^\]]+\]/gi, '')
        .replace(/\[completed::\s*[^\]]+\]/gi, '')
        .replace(/<!--\s*task-ref:\s*[^>]+\s*-->/gi, '')
        .replace(/<!--\s*gtask-id:\s*[^>]+\s*-->/gi, '')
        .trim();

      const taskId = `inline:${relPath}:${index}`;

      tasks.push({
        id: taskId,
        isAtomic: false,
        title: cleanTitle,
        description,
        status: isDone ? 'done' : 'todo',
        priority,
        due,
        assignee,
        completed,
        project: projectVal,
        parent_plan: relPath,
        filePath,
        lineIndex: index,
        taskRef,
        gtaskId,
        rawLine: line
      });
    }
  });

  return tasks;
}

let cachedTasks = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 2000;

export function invalidateTaskCache() {
  cachedTasks = null;
}

async function getFilesRecursivelyAsync(dir, fileList = []) {
  try {
    if (!fs.existsSync(dir)) return fileList;
    const files = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      if (file.name.startsWith('_') || file.name.startsWith('.')) continue;
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await getFilesRecursivelyAsync(filePath, fileList);
      } else if (file.name.endsWith('.md')) {
        fileList.push(filePath);
      }
    }
  } catch (e) {
    // Directory may not exist
  }
  return fileList;
}

async function parseMarkdownFileAsync(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
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
  } catch (e) {
    return { frontmatter: null, body: '', rawContent: '' };
  }
}

async function parseInlineTasksAsync(filePath, project) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
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

        let description = '';
        const descMatch = rawText.match(/\[description::\s*([^\]]+)\]/i);
        if (descMatch) description = descMatch[1].trim();

        let completed = null;
        const completedMatch = rawText.match(/\[completed::\s*([^\]]+)\]/i);
        if (completedMatch) completed = completedMatch[1].trim();

        let taskRef = null;
        const refMatch = rawText.match(/<!--\s*task-ref:\s*([^>\s]+)\s*-->/i);
        if (refMatch) {
          taskRef = refMatch[1];
          // Skip inline task line if it is a reference link pointing to an existing atomic file on disk
          const targetAtomicPath = path.join(path.dirname(filePath), taskRef.replace(/^\.\//, ''));
          if (fs.existsSync(targetAtomicPath)) {
            return;
          }
        }

        let gtaskId = null;
        const gtaskMatch = rawText.match(/<!--\s*gtask-id:\s*([^>\s]+)\s*-->/i);
        if (gtaskMatch) gtaskId = gtaskMatch[1];

        let projectOverride = null;
        const projectMatch = rawText.match(/\[project::\s*([^\]]+)\]/i);
        if (projectMatch) projectOverride = projectMatch[1].trim();

        let projectVal = projectOverride || project || path.basename(path.dirname(filePath));
        if (['CoworkMemory', 'cowork-memory-backup', 'KB Business', 'Kinbots Development'].includes(projectVal)) {
          projectVal = 'ACTIVE_KINBOTS';
        }

        const cleanTitle = rawText
          .replace(/\[priority::\s*[^\]]+\]/gi, '')
          .replace(/\[due::\s*[^\]]+\]/gi, '')
          .replace(/\[assignee::\s*[^\]]+\]/gi, '')
          .replace(/\[project::\s*[^\]]+\]/gi, '')
          .replace(/\[description::\s*[^\]]+\]/gi, '')
          .replace(/\[completed::\s*[^\]]+\]/gi, '')
          .replace(/<!--\s*task-ref:\s*[^>\s]+\s*-->/gi, '')
          .replace(/<!--\s*gtask-id:\s*[^>\s]+\s*-->/gi, '')
          .trim();

        const taskId = `inline:${relPath}:${index}`;

        tasks.push({
          id: taskId,
          isAtomic: false,
          title: cleanTitle,
          description,
          status: isDone ? 'done' : 'todo',
          priority,
          due,
          assignee,
          completed,
          project: projectVal,
          parent_plan: relPath,
          filePath,
          lineIndex: index,
          taskRef,
          gtaskId,
          rawLine: line
        });
      }
    });

    return tasks;
  } catch (e) {
    return [];
  }
}

let vaultTasksCache = null;
let isCacheUpdating = false;

export async function refreshVaultCache(includeArchive = false) {
  if (isCacheUpdating) return vaultTasksCache || [];
  isCacheUpdating = true;
  try {
    const activeFiles = await getFilesRecursivelyAsync(ACTIVE_PROJECTS_DIR);
    let filesToScan = [...activeFiles];

    if (includeArchive && fs.existsSync(ARCHIVE_DIR)) {
      const archiveFiles = await getFilesRecursivelyAsync(ARCHIVE_DIR);
      filesToScan.push(...archiveFiles);
    }

    const tasks = [];

    await Promise.all(
      filesToScan.map(async (filePath) => {
        const baseName = path.basename(filePath);
        const relParts = path.relative(ACTIVE_PROJECTS_DIR, filePath).split(path.sep);
        const topFolder = relParts.length > 1 ? relParts[0] : 'General';

        if (baseName.startsWith('task-') && baseName.endsWith('.md')) {
          const { frontmatter, body } = await parseMarkdownFileAsync(filePath);
          if (frontmatter && frontmatter.type === 'Task') {
            const relPath = path.relative(ACTIVE_PROJECTS_DIR, filePath).replace(/\\/g, '/');
            let project = frontmatter.project || topFolder;
            if (topFolder === 'ACTIVE_KINBOTS' || ['CoworkMemory', 'cowork-memory-backup', 'KB Business', 'Kinbots Development'].includes(project)) {
              project = 'ACTIVE_KINBOTS';
            }

            let taskTitle = frontmatter.title;
            if (!taskTitle && body) {
              const h1Match = body.match(/^#\s*(?:📋\s*Task:\s*)?([^\r\n]+)/m);
              if (h1Match) taskTitle = h1Match[1].trim();
            }
            if (!taskTitle) {
              taskTitle = baseName.replace(/^task-|\.md$/g, '').replace(/-/g, ' ');
            }

            tasks.push({
              id: `atomic:${relPath}`,
              isAtomic: true,
              title: taskTitle,
              description: frontmatter.description || '',
              status: frontmatter.status || 'todo',
              priority: (frontmatter.priority || 'medium').toLowerCase(),
              due: frontmatter.due || null,
              assignee: (frontmatter.assignee || '').toLowerCase() || null,
              completed: frontmatter.completed || frontmatter.completed_date || frontmatter.completed_at || null,
              project,
              parent_plan: frontmatter.parent_plan || 'project.md',
              filePath,
              body,
              frontmatter,
              gtaskId: frontmatter.gtask_id || null
            });
          }
        } else {
          if (baseName !== 'dashboard.md' && baseName !== 'Agent_Queue.md' && baseName !== 'weekly_review_latest.md') {
            let project = topFolder;
            if (topFolder === 'ACTIVE_KINBOTS' || ['CoworkMemory', 'cowork-memory-backup', 'KB Business', 'Kinbots Development'].includes(project)) {
              project = 'ACTIVE_KINBOTS';
            }
            const inlineTasks = await parseInlineTasksAsync(filePath, project);
            tasks.push(...inlineTasks);
          }
        }
      })
    );

    vaultTasksCache = tasks;
  } catch (err) {
    console.error('Error refreshing vault cache:', err);
  } finally {
    isCacheUpdating = false;
  }
  return vaultTasksCache || [];
}

export function getAllTasks(includeArchive = false) {
  if (!vaultTasksCache) {
    refreshVaultCache(includeArchive);
    return [];
  }
  return vaultTasksCache;
}

export async function updateTask(taskId, updates) {
  const todayStr = new Date().toISOString().slice(0, 10);
  let completedDate = updates.completed;
  if (updates.status === 'done' && completedDate === undefined) {
    completedDate = todayStr;
  } else if (updates.status && updates.status !== 'done' && updates.completed === undefined) {
    completedDate = null;
  }

  if (taskId.startsWith('atomic:')) {
    const relPath = taskId.replace('atomic:', '');
    let filePath = path.join(ACTIVE_PROJECTS_DIR, relPath);
    if (!fs.existsSync(filePath)) throw new Error(`Atomic task file not found: ${filePath}`);

    let { frontmatter, body } = parseMarkdownFile(filePath);
    if (!frontmatter) throw new Error(`Invalid frontmatter in ${filePath}`);

    const oldProject = frontmatter.project || 'General';

    if (updates.status !== undefined) frontmatter.status = updates.status;
    if (updates.priority !== undefined) frontmatter.priority = updates.priority;
    if (updates.title !== undefined) frontmatter.title = updates.title;
    if (updates.description !== undefined) {
      frontmatter.description = updates.description;
      if (body) {
        if (body.includes('## Notes')) {
          body = body.replace(/(## Notes[^\n]*\r?\n)([\s\S]*)/, `$1\n${updates.description}\n`);
        } else {
          body = `\n## Notes & Execution Steps\n\n${updates.description}\n`;
        }
      } else {
        body = `\n## Notes & Execution Steps\n\n${updates.description}\n`;
      }
    }
    if (updates.due !== undefined) frontmatter.due = updates.due;
    if (updates.assignee !== undefined) frontmatter.assignee = updates.assignee;
    if (completedDate !== undefined) {
      if (completedDate) {
        frontmatter.completed = completedDate;
      } else {
        delete frontmatter.completed;
        delete frontmatter.completed_date;
        delete frontmatter.completed_at;
      }
    }

    // Handle Project Reassignment for Atomic Tasks
    let newFilePath = filePath;
    if (updates.project !== undefined && updates.project.trim() && updates.project.trim() !== oldProject) {
      const targetProject = updates.project.trim();
      frontmatter.project = targetProject;

      // Update tags array to reflect new project tag
      if (Array.isArray(frontmatter.tags)) {
        const oldTag = oldProject.toLowerCase();
        const newTag = targetProject.toLowerCase();
        frontmatter.tags = frontmatter.tags.map((t) => (t === oldTag ? newTag : t));
        if (!frontmatter.tags.includes(newTag)) frontmatter.tags.push(newTag);
      }

      const targetProjectDir = path.join(ACTIVE_PROJECTS_DIR, targetProject);
      if (!fs.existsSync(targetProjectDir)) {
        fs.mkdirSync(targetProjectDir, { recursive: true });
      }

      let fileName = path.basename(filePath);
      let candidatePath = path.join(targetProjectDir, fileName);

      // Collision prevention: append suffix if file already exists in destination
      if (fs.existsSync(candidatePath) && candidatePath !== filePath) {
        const ext = path.extname(fileName);
        const nameWithoutExt = path.basename(fileName, ext);
        let counter = 1;
        while (fs.existsSync(candidatePath)) {
          candidatePath = path.join(targetProjectDir, `${nameWithoutExt}-${counter}${ext}`);
          counter++;
        }
        fileName = path.basename(candidatePath);
      }

      newFilePath = candidatePath;

      // Remove reference from old parent project.md
      const oldParentPlanPath = path.join(path.dirname(filePath), frontmatter.parent_plan || 'project.md');
      if (fs.existsSync(oldParentPlanPath)) {
        const oldContent = fs.readFileSync(oldParentPlanPath, 'utf8');
        const oldLines = oldContent.split(/\r?\n/).filter((l) => !l.includes(path.basename(filePath)));
        await writeFileWithRetry(oldParentPlanPath, oldLines.join('\n'));
      }

      // If physical path changed, delete old file
      if (filePath !== newFilePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Append reference to new parent project.md
      const newParentPlanPath = path.join(targetProjectDir, 'project.md');
      let inlineItem = `- [ ] ${frontmatter.title} [priority:: ${frontmatter.priority || 'medium'}] <!-- task-ref: ./${fileName} -->\n`;
      if (fs.existsSync(newParentPlanPath)) {
        const currentNewContent = fs.readFileSync(newParentPlanPath, 'utf8');
        await writeFileWithRetry(newParentPlanPath, currentNewContent + '\n' + inlineItem);
      } else {
        const initProject = `---\ntype: Project\ntitle: "${targetProject} Project"\nstatus: active\n---\n\n# ${targetProject} Project\n\n## Tasks\n${inlineItem}`;
        await writeFileWithRetry(newParentPlanPath, initProject);
      }
    }

    frontmatter.processed_at = new Date().toISOString().slice(0, 19) + 'Z';

    const newContent = `---\n${stringifyYamlFrontmatter(frontmatter)}---\n${body}`;
    await writeFileWithRetry(newFilePath, newContent);

    if (frontmatter.parent_plan) {
      const parentPath = path.join(path.dirname(newFilePath), frontmatter.parent_plan);
      if (fs.existsSync(parentPath)) {
        await syncInlineTaskFromAtomic(parentPath, path.basename(newFilePath), frontmatter.status === 'done');
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

    if (updates.status !== undefined) {
      const mark = updates.status === 'done' ? 'x' : ' ';
      line = line.replace(/^(\s*-\s*\[)[ xX](\])/, `$1${mark}$2`);
    }

    if (updates.title !== undefined && updates.title.trim()) {
      const prefixMatch = line.match(/^(\s*-\s*\[[ xX]\]\s*)/);
      const prefix = prefixMatch ? prefixMatch[1] : '- [ ] ';
      const metaMatch = line.match(/(\s*\[(priority|due|assignee|project|description|completed)::.*|<!--.*)/i);
      const metadataStr = metaMatch ? metaMatch[0] : '';
      line = `${prefix}${updates.title.trim()}${metadataStr}`;
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
        if (updates.due) {
          line = line.replace(/\[due::\s*[^\]]+\]/i, `[due:: ${updates.due}]`);
        } else {
          line = line.replace(/\s*\[due::\s*[^\]]+\]/i, '');
        }
      } else if (updates.due) {
        line += ` [due:: ${updates.due}]`;
      }
    }

    if (updates.description !== undefined) {
      const cleanDesc = (updates.description || '').replace(/[\r\n]+/g, ' ').trim();
      if (/\[description::\s*[^\]]+\]/i.test(line)) {
        if (cleanDesc) {
          line = line.replace(/\[description::\s*[^\]]+\]/i, `[description:: ${cleanDesc}]`);
        } else {
          line = line.replace(/\s*\[description::\s*[^\]]+\]/i, '');
        }
      } else if (cleanDesc) {
        line += ` [description:: ${cleanDesc}]`;
      }
    }

    if (updates.project !== undefined && updates.project.trim()) {
      const targetProj = updates.project.trim();
      if (/\[project::\s*[^\]]+\]/i.test(line)) {
        line = line.replace(/\[project::\s*[^\]]+\]/i, `[project:: ${targetProj}]`);
      } else {
        line += ` [project:: ${targetProj}]`;
      }
    }

    if (completedDate !== undefined) {
      if (/\[completed::\s*[^\]]+\]/i.test(line)) {
        if (completedDate) {
          line = line.replace(/\[completed::\s*[^\]]+\]/i, `[completed:: ${completedDate}]`);
        } else {
          line = line.replace(/\s*\[completed::\s*[^\]]+\]/i, '');
        }
      } else if (completedDate) {
        line += ` [completed:: ${completedDate}]`;
      }
    }

    lines[lineIndex] = line;
    await writeFileWithRetry(filePath, lines.join('\n'));
  }

  await refreshVaultCache();
  await syncObsidianDashboard();
  return true;
}

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

export async function createTask(taskData) {
  const { title, description, project, priority = 'medium', due = null, assignee = null, isAtomic = true } = taskData;
  const targetProject = project || 'General';
  const projectDir = path.join(ACTIVE_PROJECTS_DIR, targetProject);

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().slice(0, 19) + 'Z';

  if (isAtomic) {
    const slug = slugify(title);
    const fileName = `task-${slug}.md`;
    const filePath = path.join(projectDir, fileName);

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

    const content = `---\n${stringifyYamlFrontmatter(frontmatter)}---\n\n## Notes & Execution Steps\n\n* Task created via Task Dashboard UI.\n`;
    await writeFileWithRetry(filePath, content);

    const projectMdPath = path.join(projectDir, 'project.md');
    let inlineItem = `- [ ] ${title} [priority:: ${priority}]`;
    if (due) inlineItem += ` [due:: ${due}]`;
    if (assignee) inlineItem += ` [assignee:: ${assignee}]`;
    inlineItem += ` <!-- task-ref: ./${fileName} -->\n`;

    if (fs.existsSync(projectMdPath)) {
      const current = fs.readFileSync(projectMdPath, 'utf8');
      await writeFileWithRetry(projectMdPath, current + '\n' + inlineItem);
    } else {
      const initProject = `---\ntype: Project\ntitle: "${targetProject} Project"\nstatus: active\n---\n\n# ${targetProject} Project\n\n## Tasks\n${inlineItem}`;
      await writeFileWithRetry(projectMdPath, initProject);
    }
  } else {
    const projectMdPath = path.join(projectDir, 'project.md');
    let inlineItem = `- [ ] ${title} [priority:: ${priority}]`;
    if (due) inlineItem += ` [due:: ${due}]`;
    if (assignee) inlineItem += ` [assignee:: ${assignee}]`;

    if (fs.existsSync(projectMdPath)) {
      const current = fs.readFileSync(projectMdPath, 'utf8');
      await writeFileWithRetry(projectMdPath, current + '\n' + inlineItem + '\n');
    } else {
      const initProject = `---\ntype: Project\ntitle: "${targetProject} Project"\nstatus: active\n---\n\n# ${targetProject} Project\n\n## Tasks\n${inlineItem}\n`;
      await writeFileWithRetry(projectMdPath, initProject);
    }
  }

  await refreshVaultCache();
  await syncObsidianDashboard();
  return true;
}

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

export async function undoPromoteTask(atomicTaskId) {
  const allTasks = getAllTasks(true);
  const task = allTasks.find((t) => t.id === atomicTaskId);
  if (!task || !task.isAtomic) return false;

  const fileName = path.basename(task.filePath);
  const projectDir = path.dirname(task.filePath);

  if (fs.existsSync(task.filePath)) {
    fs.unlinkSync(task.filePath);
  }

  if (task.parent_plan) {
    const parentPath = path.join(projectDir, task.parent_plan);
    if (fs.existsSync(parentPath)) {
      const content = fs.readFileSync(parentPath, 'utf8');
      const lines = content.split(/\r?\n/);
      const newLines = lines.map((line) => {
        if (line.includes(fileName)) {
          return line.replace(/\s*<!--\s*task-ref:\s*[^>]+\s*-->/gi, '');
        }
        return line;
      });
      await writeFileWithRetry(parentPath, newLines.join('\n'));
    }
  }

  await syncObsidianDashboard();
  return true;
}

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
        md += `| [ ] | ${t.title} | ${t.project} | ${t.due} | ${t.priority} |\n`;
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
        md += `| [ ] | ${t.title} | ${t.project} | ${t.priority} | ${t.status} |\n`;
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
        md += `| [ ] | ${t.title} | ${t.project} | ${t.due || '—'} | ${t.assignee || '—'} |\n`;
      });
      md += `\n`;
    }

    md += `---\n\n## 📂 Master Active Projects Checklist\n\n| ✔️ | Task | Project | Priority | Due Date | Assignee | Sync Status |\n| :---: | :--- | :--- | :---: | :---: | :---: | :---: |\n`;

    activeTasks.forEach((t) => {
      const gSync = t.gtaskId ? `[🔗 Synced](https://calendar.google.com/calendar/r/tasks)` : `—`;
      md += `| [ ] | ${t.title} | ${t.project} | ${t.priority} | ${t.due || '—'} | ${t.assignee || '—'} | ${gSync} |\n`;
    });

    await writeFileWithRetry(DASHBOARD_MD_PATH, md);
  } catch (err) {
    console.error('Error syncing Obsidian dashboard:', err);
  }
}

export async function getProjectDetail(projectName) {
  if (!projectName) throw new Error('Project name is required');
  const projectDir = path.join(ACTIVE_PROJECTS_DIR, projectName);
  const projectMdPath = path.join(projectDir, 'project.md');

  if (!fs.existsSync(projectMdPath)) {
    return {
      name: projectName,
      title: `${projectName} Project`,
      status: 'active',
      description: '',
      target_date: '',
      owner: '',
      body: '',
      exists: false,
      filePath: projectMdPath
    };
  }

  const { frontmatter, body } = parseMarkdownFile(projectMdPath);
  
  let notesBody = body || '';
  if (notesBody.includes('## Tasks')) {
    notesBody = notesBody.split('## Tasks')[0].trim();
  }

  return {
    name: projectName,
    title: (frontmatter && frontmatter.title) || `${projectName} Project`,
    status: (frontmatter && frontmatter.status) || 'active',
    description: (frontmatter && frontmatter.description) || '',
    target_date: (frontmatter && (frontmatter.target_date || frontmatter.due)) || '',
    owner: (frontmatter && (frontmatter.owner || frontmatter.assignee)) || '',
    body: notesBody.replace(/^#\s*[^\r\n]+\r?\n/, '').trim(),
    exists: true,
    filePath: projectMdPath
  };
}

export async function updateProjectDetail(projectName, updates) {
  if (!projectName) throw new Error('Project name is required');
  let targetProjectName = projectName;

  if (updates.name && updates.name.trim() && updates.name.trim() !== projectName) {
    const newProjectName = updates.name.trim();
    const oldDir = path.join(ACTIVE_PROJECTS_DIR, projectName);
    const newDir = path.join(ACTIVE_PROJECTS_DIR, newProjectName);

    if (fs.existsSync(oldDir)) {
      if (fs.existsSync(newDir)) {
        throw new Error(`A project directory named "${newProjectName}" already exists.`);
      }
      fs.renameSync(oldDir, newDir);
    }
    targetProjectName = newProjectName;
  }

  const targetDir = path.join(ACTIVE_PROJECTS_DIR, targetProjectName);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const projectMdPath = path.join(targetDir, 'project.md');

  let existingTasksSection = '';
  if (fs.existsSync(projectMdPath)) {
    const existingContent = fs.readFileSync(projectMdPath, 'utf8');
    if (existingContent.includes('## Tasks')) {
      existingTasksSection = '\n\n## Tasks' + existingContent.split('## Tasks')[1];
    }
  }

  const frontmatter = {
    type: 'Project',
    title: updates.title || `${targetProjectName} Project`,
    status: updates.status || 'active',
    description: updates.description || '',
    target_date: updates.target_date || '',
    owner: updates.owner || '',
    updated: new Date().toISOString().slice(0, 10)
  };

  const cleanBody = (updates.body || '').trim();
  const fullContent = `---\n${stringifyYamlFrontmatter(frontmatter)}---\n\n# ${frontmatter.title}\n\n${cleanBody}${existingTasksSection}\n`;

  await writeFileWithRetry(projectMdPath, fullContent);
  await refreshVaultCache();
  await syncObsidianDashboard();
  return { success: true, name: targetProjectName };
}
