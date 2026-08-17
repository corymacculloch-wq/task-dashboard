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

  for (const item of fileResults) {
    if (!item) continue;
    const filename = item.path.split('/').pop();
    const pathParts = item.path.split('/');
    const projectName = pathParts.length > 2 ? pathParts[1] : 'General';

    if (filename.startsWith('task-')) {
      // Atomic task note
      const task = parseAtomicTaskNote(item.path, item.text, item.sha);
      tasks.push(task);
    } else if (filename === 'project.md' || filename === 'plan.md') {
      // Parse inline checkboxes inside project/plan notes
      const inlineTasks = parseInlineCheckboxes(item.text, item.path, projectName);
      inlineTasks.forEach((t) => (t.sha = item.sha));
      tasks.push(...inlineTasks);
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
