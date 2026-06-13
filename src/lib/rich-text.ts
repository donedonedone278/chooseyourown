import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

// Chapter content is stored as standard CommonMark Markdown, deliberately
// restricted to a small subset so stored content stays portable and safe.
// We never invent syntax — we just reject documents that use constructs outside
// this allowlist (links, images, headings, code, raw HTML, lists, etc.).

// mdast node types we allow. Anything else fails validation.
const ALLOWED_NODE_TYPES = new Set(['root', 'paragraph', 'text', 'strong', 'emphasis', 'break']);

// Link-ish nodes get a dedicated message since the spec calls links out explicitly.
const LINK_NODE_TYPES = new Set(['link', 'linkReference', 'definition', 'imageReference']);

// HTML element allowlist for rendering (react-markdown `allowedElements`).
export const ALLOWED_MARKDOWN_ELEMENTS = ['p', 'strong', 'em', 'br'] as const;

const parser = unified().use(remarkParse);

/**
 * Validate chapter Markdown server-side. Returns the trimmed Markdown on
 * success (faithful — not re-serialized); throws with a clear message otherwise.
 */
export function validateChapterContent(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Chapter content must be text.');
  }

  const content = input.trim();
  if (content === '') {
    throw new Error('Chapter content cannot be empty.');
  }

  const tree = parser.parse(content);

  visit(tree, (node) => {
    if (LINK_NODE_TYPES.has(node.type)) {
      throw new Error('Links are not allowed in chapter content.');
    }
    if (!ALLOWED_NODE_TYPES.has(node.type)) {
      throw new Error(`Unsupported formatting in chapter content: ${node.type}.`);
    }
  });

  return content;
}
