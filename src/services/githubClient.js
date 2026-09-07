/**
 * githubClient.js
 * 
 * GitHub REST API client for serverless reading, parsing, and committing task Markdown files
 * directly to a private GitHub repository.
 */

import { base64ToUtf8, utf8ToBase64, parseAtomicTaskNote, parseInlineCheckboxes } from '../utils/vaultParserBrowser';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Validates a GitHub Personal Access Token (PAT).
 */
export async function validateToken(token) {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    if (!res.ok) return { valid: false, error: 'Invalid or expired GitHub Personal Access Token.' };
    const user = await res.json();
    return { valid: true, user: user.login };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Fetches directory listing for 1.active_projects recursively using Git Trees API (1 API request).
 */
export async function fetchVaultTree(token, owner, repo, branch = 'main') {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch repository tree: ${res.statusText}`);
  }

  const data = await res.json();
  // Filter for files inside 1.active_projects/ ending with .md
  return (data.tree || []).filter(
    (item) => item.type === 'blob' && item.path.startsWith('1.active_projects/') && item.path.endsWith('.md')
  );
}

/**
 * Fetches and decodes a single Markdown file from GitHub API.
 */
export async function fetchFileContent(token, owner, repo, path) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch file content for ${path}: ${res.statusText}`);
  }

  const fileData = await res.json();
  const rawText = base64ToUtf8(fileData.content);
  return {
    path: fileData.path,
    sha: fileData.sha,
    text: rawText
  };
}

/**
 * Fetches all tasks across 1.active_projects in the private repository.
 * Deduplicates inline checklist items that reference atomic task notes per GTD SOP.
 */
export async function fetchAllTasksFromGitHub(token, owner, repo) {
  const projectFiles = await fetchVaultTree(token, owner, repo);
  const tasks = [];

  // Parallel fetch for active project files
  const filePromises = projectFiles.map((file) =>
    fetchFileContent(token, owner, repo, file.path).catch((err) => {
      console.warn(`Skipping file ${file.path} due to error:`, err);
      return null;
    })
  );

  const fileResults = await Promise.all(filePromises);

  // Maps and sets for deduplication
  const atomicTaskMap = new Map();
  const atomicTaskRefs = new Set();
  const atomicTaskByProjectTitle = new Map();

  const inlineFiles = [];

  // Pass 1: Parse all atomic task notes first
  for (const item of fileResults) {
    if (!item) continue;
    const filename = item.path.split('/').pop();
    const pathParts = item.path.split('/');
    const projectName = pathParts.length > 2 ? pathParts[1] : 'General';

    if (filename.startsWith('task-')) {
      const task = parseAtomicTaskNote(item.path, item.text, item.sha);
      tasks.push(task);

      const cleanBase = filename.toLowerCase();
      const noExt = cleanBase.replace(/\.md$/, '');
      atomicTaskRefs.add(cleanBase);
      atomicTaskRefs.add(noExt);
      atomicTaskMap.set(cleanBase, task);
      atomicTaskMap.set(noExt, task);

      const normTitleKey = `${(task.project || projectName).toLowerCase()}:::${task.title.toLowerCase().trim()}`;
      atomicTaskByProjectTitle.set(normTitleKey, task);
    } else if (filename === 'project.md' || filename === 'plan.md') {
      inlineFiles.push(item);
    }
  }

  // Pass 2: Parse inline checkboxes and deduplicate
  for (const item of inlineFiles) {
    const pathParts = item.path.split('/');
    const projectName = pathParts.length > 2 ? pathParts[1] : 'General';
    const inlineTasks = parseInlineCheckboxes(item.text, item.path, projectName);

    for (const inlineTask of inlineTasks) {
      inlineTask.sha = item.sha;

      let matchedAtomicTask = null;

      // 1. Match via taskRef pointer
      if (inlineTask.taskRef) {
        const refLower = inlineTask.taskRef.toLowerCase();
        const refNoExt = refLower.replace(/\.md$/, '');
        if (atomicTaskRefs.has(refLower) || atomicTaskRefs.has(refNoExt)) {
          matchedAtomicTask = atomicTaskMap.get(refLower) || atomicTaskMap.get(refNoExt);
        }
      }

      // 2. Fallback match: same project and identical normalized title
      if (!matchedAtomicTask && inlineTask.title) {
        const normTitleKey = `${projectName.toLowerCase()}:::${inlineTask.title.toLowerCase().trim()}`;
        if (atomicTaskByProjectTitle.has(normTitleKey)) {
          matchedAtomicTask = atomicTaskByProjectTitle.get(normTitleKey);
        }
      }

      if (matchedAtomicTask) {
        // Safe status merge: if inline checkbox is checked, ensure atomic task reflects completion
        if (inlineTask.status === 'done' && matchedAtomicTask.status !== 'done') {
          matchedAtomicTask.status = 'done';
        }
        // Deduplicate: atomic task file already represents this item
        continue;
      }

      // Genuine standalone inline task without an atomic file
      tasks.push(inlineTask);
    }
  }

  return tasks;
}

/**
 * Commits a file update to the private GitHub repository via PUT /contents/{path}.
 */
export async function commitFileToGitHub(token, owner, repo, path, sha, contentText, commitMessage) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
  const base64Content = utf8ToBase64(contentText);

  const payload = {
    message: commitMessage,
    content: base64Content,
    branch: 'main'
  };

  if (sha) {
    payload.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`GitHub Commit Failed: ${errorData.message || res.statusText}`);
  }

  const responseData = await res.json();
  return {
    success: true,
    sha: responseData.content.sha,
    commitSha: responseData.commit.sha
  };
}

/**
 * Safely updates an inline task checkbox inside project.md or plan.md without modifying other lines.
 */
export async function updateInlineTaskInFile(token, owner, repo, filePath, lineIndex, rawLine, newStatus) {
  const fileData = await fetchFileContent(token, owner, repo, filePath);
  const lines = fileData.text.split(/\r?\n/);

  let targetIndex = -1;
  if (lineIndex !== undefined && lineIndex < lines.length && lines[lineIndex].includes('- [')) {
    targetIndex = lineIndex;
  } else if (rawLine) {
    targetIndex = lines.findIndex((l) => l.trim() === rawLine.trim());
  }

  if (targetIndex === -1) {
    throw new Error(`Could not find task line in ${filePath}`);
  }

  const mark = newStatus === 'done' ? 'x' : ' ';
  lines[targetIndex] = lines[targetIndex].replace(/^(\s*-\s*\[)[ xX](\])/, `$1${mark}$2`);

  const updatedText = lines.join('\n');
  const commitMsg = `Update checklist item status to ${newStatus}`;
  return await commitFileToGitHub(token, owner, repo, filePath, fileData.sha, updatedText, commitMsg);
}

/**
 * Safely updates metadata properties of an inline task in project.md without modifying frontmatter or other sections.
 */
export async function updateInlineTaskPropertiesInFile(token, owner, repo, filePath, lineIndex, rawLine, updates) {
  const fileData = await fetchFileContent(token, owner, repo, filePath);
  const lines = fileData.text.split(/\r?\n/);

  let targetIndex = -1;
  if (lineIndex !== undefined && lineIndex < lines.length && lines[lineIndex].includes('- [')) {
    targetIndex = lineIndex;
  } else if (rawLine) {
    targetIndex = lines.findIndex((l) => l.trim() === rawLine.trim());
  }

  if (targetIndex === -1) {
    throw new Error(`Could not find task line in ${filePath}`);
  }

  let line = lines[targetIndex];

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
  if (updates.assignee !== undefined) {
    if (/\[assignee::\s*[^\]]+\]/i.test(line)) {
      line = line.replace(/\[assignee::\s*[^\]]+\]/i, `[assignee:: ${updates.assignee}]`);
    } else {
      line += ` [assignee:: ${updates.assignee}]`;
    }
  }

  lines[targetIndex] = line;
  const updatedText = lines.join('\n');
  const commitMsg = `Update checklist item properties`;
  return await commitFileToGitHub(token, owner, repo, filePath, fileData.sha, updatedText, commitMsg);
}
