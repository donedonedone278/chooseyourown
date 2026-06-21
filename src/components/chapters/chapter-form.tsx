import { ChapterEditor } from '@/components/editor/chapter-editor';
import { MAX_OPTION_LABEL } from '@/lib/chapters';
import styles from './chapter-form.module.css';

// Shared form for both starting a story (includeStoryTitle) and adding a child
// chapter. The `action` is a server action that reads `storyTitle`, `title`,
// `label`, and `content` from the submitted FormData.
//
// Story-start mode (`includeStoryTitle`) is unchanged: only a required title,
// no label. Child mode adds a **Choice label** field — the primary field for
// a child chapter — and makes the title optional (defaults to the label):
//  - open-branch: label is a required, editable text input.
//  - claiming a suggested prompt (`fixedLabel` set): label is fixed/read-only,
//    since the prompt's wording is what's being fulfilled, not rewritten.
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
      {!includeStoryTitle ? (
        fixedLabel ? (
          <label>
            Choice label
            <input type="text" value={fixedLabel} readOnly />
            <input type="hidden" name="label" value={fixedLabel} />
          </label>
        ) : (
          <label>
            Choice label
            <input name="label" type="text" required maxLength={MAX_OPTION_LABEL} />
          </label>
        )
      ) : null}
      <label>
        Chapter title
        <input
          name="title"
          type="text"
          required={includeStoryTitle}
          placeholder={includeStoryTitle ? undefined : 'defaults to the choice label'}
        />
      </label>
      <ChapterEditor />
      <button type="submit" className={`btn btn--primary ${styles.submit}`}>
        {submitLabel}
      </button>
    </form>
  );
}
