/**
 * vaultParserBrowser.js
 * 
 * Pure client-side Markdown & YAML frontmatter parser and serializer for Vault tasks.
 * Zero Node.js 'fs' dependencies - runs 100% in browser.
 */

/**
 * Parses raw YAML frontmatter from Markdown text string.
 */
export function parseYamlFrontmatter(text) {
  const obj = {};
  const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!match) return { frontmatter: obj, body: text };

  const yamlText = match[1];
  const body = text.slice(match[0].length);

  for (const line of yamlText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > -1) {
      const key = trimmed.slice(0, colonIndex).trim();
      let val = trimmed.slice(colonIndex + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      obj[key] = val;
    }
  }

  return { frontmatter: obj, body };
}

/**
 * Extracts inline markdown checkboxes (- [ ] task) from note body.
 */
export function parseInlineCheckboxes(text, filePath, projectName) {
  const inlineTasks = [];
  const lines = text.split(/\r?\n/);
  
  lines.forEach((line, index) => {
    const match = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
    if (match) {
      const isDone = match[2].toLowerCase() === 'x';
      const content = match[3].trim();
      
      // Parse inline metadata like [assignee:: agent] or [due:: 2026-08-17]
      const assigneeMatch = content.match(/\[assignee::\s*([^\]]+)\]/i);
      const dueMatch = content.match(/\[due::\s*([^\]]+)\]/i);
      const priorityMatch = content.match(/\[priority::\s*([^\]]+)\]/i);
      
      inlineTasks.push({
        id: `${filePath}#L${index + 1}`,
        filePath,
        lineIndex: index,
        title: content.replace(/\[[^\]]+\]/g, '').trim(),
        status: isDone ? 'done' : 'todo',
        assignee: assigneeMatch ? assigneeMatch[1].trim() : 'human',
        due: dueMatch ? dueMatch[1].trim() : null,
        priority: priorityMatch ? priorityMatch[1].trim() : 'medium',
        project: projectName,
        isInline: true
      });
    }
  });

  return inlineTasks;
}

/**
 * Parses an atomic task Markdown note (e.g. task-101.md).
 */
export function parseAtomicTaskNote(filePath, content, sha) {
  const { frontmatter, body } = parseYamlFrontmatter(content);
  const filename = filePath.split('/').pop();
  
  // Project folder name extraction
  const pathParts = filePath.split('/');
  const projectName = pathParts.length > 2 ? pathParts[1] : 'General';

  return {
    id: frontmatter.id || filename.replace('.md', ''),
    filePath,
    sha,
    title: frontmatter.title || filename.replace('.md', '').replace(/-/g, ' '),
    status: (frontmatter.status || 'todo').toLowerCase(),
    assignee: (frontmatter.assignee || 'human').toLowerCase(),
    priority: (frontmatter.priority || 'medium').toLowerCase(),
    due: frontmatter.due || null,
    project: frontmatter.project || projectName,
    created: frontmatter.created || null,
    isInline: false,
    content: body,
    frontmatter
  };
}

/**
 * Serializes updated frontmatter and body back into standard Markdown string.
 */
export function serializeTaskToMarkdown(frontmatterObj, bodyText) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(frontmatterObj)) {
    if (value !== undefined && value !== null) {
      lines.push(`${key}: "${value}"`);
    }
  }
  lines.push('---');
  lines.push('');
  lines.push(bodyText.trim());
  lines.push('');
  return lines.join('\n');
}

/**
 * Encodes string to UTF-8 safe Base64 string for GitHub REST API commits.
 */
export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes Base64 string from GitHub REST API to UTF-8 string.
 */
export function base64ToUtf8(base64Str) {
  const cleanBase64 = base64Str.replace(/\s/g, '');
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}
