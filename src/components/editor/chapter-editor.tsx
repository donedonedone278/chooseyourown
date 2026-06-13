'use client';

import { useState } from 'react';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import styles from './chapter-editor.module.css';
import { serializeDocToMarkdown } from '@/lib/chapter-markdown';

// WYSIWYG editor (Tiptap/ProseMirror) restricted to the same Markdown subset
// accepted by `validateChapterContent`: paragraphs, bold, italic, and hard
// breaks. The document is serialized to that exact Markdown subset on every
// change and submitted via the hidden `content` field — storage, validation,
// and rendering (`MarkdownContent`) are unchanged.
export function ChapterEditor() {
  const [markdown, setMarkdown] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  // Re-render on selection/transaction changes too, so toolbar
  // `aria-pressed` state (editor.isActive(...)) stays in sync — `onUpdate`
  // alone only fires for document content changes.
  const [, forceRender] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Keep only document, paragraph, text, bold, italic, history, hardBreak.
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        link: false,
        underline: false
      })
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'aria-labelledby': 'chapter-content-label',
        role: 'textbox',
        'aria-multiline': 'true'
      }
    },
    onUpdate: ({ editor }) => {
      setMarkdown(serializeDocToMarkdown(editor.getJSON()));
    },
    onCreate: ({ editor }) => {
      setMarkdown(serializeDocToMarkdown(editor.getJSON()));
    },
    onSelectionUpdate: () => {
      forceRender((value) => value + 1);
    },
    onTransaction: () => {
      forceRender((value) => value + 1);
    }
  });

  return (
    <div>
      <span id="chapter-content-label">Chapter content</span>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.toolbarButton}
          data-mark="bold"
          aria-label="Bold"
          aria-pressed={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          data-mark="italic"
          aria-label="Italic"
          aria-pressed={editor?.isActive('italic') ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          aria-pressed={showMarkdown}
          onClick={() => setShowMarkdown((value) => !value)}
        >
          View Markdown
        </button>
      </div>
      <div className={styles.content}>
        <EditorContent editor={editor} />
      </div>
      <input type="hidden" name="content" value={markdown} />
      <p id="content-help">
        Select text and use Bold/Italic (or &#8984;/Ctrl+B, &#8984;/Ctrl+I).
      </p>
      {showMarkdown ? (
        <pre aria-label="Markdown source" className={styles.markdownView}>
          {markdown}
        </pre>
      ) : null}
    </div>
  );
}
