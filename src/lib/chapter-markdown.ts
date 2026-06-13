// Pure ProseMirror-doc -> restricted-Markdown serializer for the Tiptap chapter
// editor. The editor always starts empty (no edit-existing-chapter flow), so
// this is doc -> Markdown only — never Markdown -> doc. Output always stays
// within the subset accepted by `validateChapterContent` (paragraph/text/
// strong/emphasis/break), so it is safe to persist directly.

type DocMark = { type: string };

type DocNode = {
  type: string;
  text?: string;
  marks?: DocMark[];
  content?: unknown[];
};

function asDocNode(value: unknown): DocNode | null {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return null;
  }
  return value as DocNode;
}

function childNodes(node: DocNode): DocNode[] {
  return (node.content ?? []).map(asDocNode).filter((child): child is DocNode => child !== null);
}

// Characters that have special meaning to CommonMark and must be escaped so
// literal text round-trips as text rather than re-parsing into formatting.
const ESCAPE_CHARS = /[\\*_`]/g;

// Leading sequences that would start a block construct (heading, blockquote,
// list item) if left unescaped at the start of a paragraph.
const LEADING_BLOCK_SYNTAX = /^(#{1,6}\s|>|[-+~]\s|\d+[.)]\s)/;

function escapeText(text: string): string {
  return text.replace(ESCAPE_CHARS, (char) => `\\${char}`);
}

function escapeLeading(text: string): string {
  const match = text.match(LEADING_BLOCK_SYNTAX);
  if (!match) {
    return text;
  }
  // Escape just the first character of the matched marker (e.g. `#`, `>`,
  // `-`, `+`, `~`, or the leading digit of an ordered-list marker).
  return `\\${text[0]}${text.slice(1)}`;
}

function serializeTextNode(node: DocNode, isFirstInParagraph: boolean): string {
  let text = escapeText(node.text ?? '');
  if (isFirstInParagraph) {
    text = escapeLeading(text);
  }

  const markTypes = new Set((node.marks ?? []).map((mark) => mark.type));
  const bold = markTypes.has('bold');
  const italic = markTypes.has('italic');

  if (bold && italic) {
    return `***${text}***`;
  }
  if (bold) {
    return `**${text}**`;
  }
  if (italic) {
    return `*${text}*`;
  }
  return text;
}

function serializeParagraph(node: DocNode): string {
  const children = childNodes(node);
  let result = '';
  let seenText = false;

  for (const child of children) {
    if (child.type === 'hardBreak') {
      result += '\\\n';
      continue;
    }
    if (child.type === 'text') {
      result += serializeTextNode(child, !seenText);
      seenText = true;
      continue;
    }
    // Any other inline node type is outside the subset; skip its content.
  }

  return result;
}

/**
 * Serialize a ProseMirror document (as JSON, e.g. `editor.getJSON()`) to the
 * restricted Markdown subset accepted by `validateChapterContent`. Empty
 * paragraphs are dropped, paragraphs are joined with a blank line, and the
 * result is trimmed.
 */
export function serializeDocToMarkdown(doc: DocNode): string {
  const blocks = childNodes(doc);

  const paragraphs = blocks
    .filter((block) => block.type === 'paragraph')
    .map((block) => serializeParagraph(block))
    .filter((text) => text.trim() !== '');

  return paragraphs.join('\n\n').trim();
}
