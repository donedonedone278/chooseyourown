'use client';

import { useState } from 'react';

import { ChapterEditor } from '@/components/editor/chapter-editor';
import { MAX_OPTION_LABEL } from '@/lib/chapter-constants';
import styles from './chapter-form.module.css';

// Shared form for both starting a story (includeStoryTitle) and adding a child
// chapter. The `action` is a server action that reads `storyTitle`, `title`,
// `label`, and `content` from the submitted FormData.
//
// Story-start mode (`includeStoryTitle`) is unchanged: only a required title,
// no label. Child mode adds a **Choice label** field — the primary field for
// a child chapter — and makes the title optional (it defaults to the label, so
// the title input's placeholder mirrors the label live):
//  - open-branch: label is a required, editable text input.
//  - claiming a suggested prompt (`fixedLabel` set): label is fixed and shown
//    locked (read-only + a lock cue), since the prompt's wording is what's being
//    fulfilled, not rewritten.
export function ChapterForm({
  action,
  submitLabel,
  includeStoryTitle = false,
  fixedLabel,
  optionId
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  includeStoryTitle?: boolean;
  /** Set when claiming an existing suggested prompt — the label is fixed. */
  fixedLabel?: string;
  /** The prompt's option id, submitted as `option` so the action claims it. */
  optionId?: string;
}) {
  // Track the choice label so the chapter-title placeholder can show the actual
  // choice text (what the title defaults to). When claiming, it's the fixed label.
  const [label, setLabel] = useState(fixedLabel ?? '');
  const isChild = !includeStoryTitle;
  const isClaiming = Boolean(fixedLabel);

  return (
    <form action={action} className={styles.form}>
      {optionId ? <input type="hidden" name="option" value={optionId} /> : null}
      {includeStoryTitle ? (
        <label>
          Story title
          <input name="storyTitle" type="text" required />
        </label>
      ) : null}
      {includeStoryTitle ? (
        <fieldset>
          <legend>Who can tag chapters?</legend>
          <label>
            <input type="radio" name="tagPermission" value="crowd" defaultChecked />
            Anyone
          </label>
          <label>
            <input type="radio" name="tagPermission" value="author" />
            Only me
          </label>
        </fieldset>
      ) : null}
      {isChild ? (
        isClaiming ? (
          <label className={styles.lockedField}>
            Choice label
            <input
              type="text"
              value={fixedLabel}
              readOnly
              aria-readonly="true"
              className={styles.lockedInput}
              title="Suggested by the author — can’t be edited"
            />
            <input type="hidden" name="label" value={fixedLabel} />
            {/* aria-hidden: `readOnly` already conveys the state to AT, and this
                must not leak into the input's accessible name ("Choice label"). */}
            <span className={styles.lockNote} aria-hidden="true">
              🔒 suggested by the author — can’t be edited
            </span>
          </label>
        ) : (
          <label>
            Choice label
            <input
              name="label"
              type="text"
              required
              maxLength={MAX_OPTION_LABEL}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
        )
      ) : null}
      <label>
        Chapter title
        <input
          name="title"
          type="text"
          required={includeStoryTitle}
          // Child mode: show the choice text the title will default to (live as
          // the label is typed; the fixed label when claiming). Empty ⇒ no hint.
          placeholder={isChild ? label || undefined : undefined}
        />
      </label>
      <ChapterEditor />
      <button type="submit" className={`btn btn--primary ${styles.submit}`}>
        {submitLabel}
      </button>
    </form>
  );
}
