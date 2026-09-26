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
 * Helper to normalize a task reference string to just the base filename (e.g. "task-xyz.md").
 * Handles [[task-xyz.md]], ./task-xyz.md, subpaths, and whitespace.
 */
export function normalizeTaskRef(ref) {
  if (!ref) return '';
  let clean = ref.trim();
  // Strip wikilink brackets [[...]]
  clean = clean.replace(/^\[\[(.*)\]\]$/, '$1').trim();
  // Strip leading ./ or path traversal
  clean = clean.replace(/^\.\//, '');
  // Extract basename
  clean = clean.split('/').pop().split('\\').pop().trim();
  return clean;
}

/**
 * Extracts inline markdown checkboxes (- [ ] task) from note body.
 */
export function parseInlineCheckboxes(text, filePath, projectName) {
  const inlineTasks = [];
  const lines = text.split(/\r?\n/);
  
  lines.forEach((line, index) => {
    const match = line.match(/^(\s*)(?:-|\*)\s*\[([ xX])\]\s*(.*)$/);
    if (match) {
      const isDone = match[2].toLowerCase() === 'x';
      const rawContent = match[3].trim();
      
      // Parse inline metadata like [assignee:: agent] or [due:: 2026-08-17]
      const assigneeMatch = rawContent.match(/\[assignee::\s*([^\]]+)\]/i);
      const dueMatch = rawContent.match(/\[due::\s*([^\]]+)\]/i);
      const priorityMatch = rawContent.match(/\[priority::\s*([^\]]+)\]/i);
      const descMatch = rawContent.match(/\[description::\s*([^\]]+)\]/i);
      
      // Parse task-ref (e.g. <!-- task-ref: task-xyz.md --> or <!-- task-ref: ./task-xyz.md --> or <!-- task-ref: [[task-xyz.md]] -->)
      const refMatch = rawContent.match(/<!--\s*task-ref:\s*([^>\s]+)\s*-->/i);
      const rawTaskRef = refMatch ? refMatch[1].trim() : null;
      const taskRef = rawTaskRef ? normalizeTaskRef(rawTaskRef) : null;

      // Parse gtask-id
      const gtaskMatch = rawContent.match(/<!--\s*gtask-id:\s*([^>\s]+)\s*-->/i);
      const gtaskId = gtaskMatch ? gtaskMatch[1].trim() : null;

      // Parse email-ref
      const emailMatch = rawContent.match(/<!--\s*email-ref:\s*([^>\s]+)\s*-->/i);
      const emailRef = emailMatch ? emailMatch[1].trim() : null;

      // Clean title: remove all bracketed tags and all HTML comments
      const cleanTitle = rawContent
        .replace(/\[[a-zA-Z0-9_-]+::\s*[^\]]+\]/gi, '')
        .replace(/\[[^\]]+\]/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim();

      inlineTasks.push({
        id: `${filePath}#L${index + 1}`,
        filePath,
        lineIndex: index,
        rawLine: line,
        title: cleanTitle,
        description: descMatch ? descMatch[1].trim() : '',
        status: isDone ? 'done' : 'todo',
        assignee: assigneeMatch ? assigneeMatch[1].trim() : 'human',
        due: dueMatch ? dueMatch[1].trim() : null,
        priority: priorityMatch ? priorityMatch[1].trim() : 'medium',
        project: projectName,
        taskRef,
        gtaskId,
        email_ref: emailRef,
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
    frontmatter,
    email_ref: frontmatter.email_ref || null,
    email_sender: frontmatter.email_sender || null,
    email_snippet: frontmatter.email_snippet || null
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
