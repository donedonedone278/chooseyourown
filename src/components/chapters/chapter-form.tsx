import { ChapterEditor } from '@/components/editor/chapter-editor';
import styles from './chapter-form.module.css';

// Shared form for both starting a story (includeStoryTitle) and adding a child
// chapter. The `action` is a server action that reads `storyTitle`, `title`,
// and `content` from the submitted FormData.
export function ChapterForm({
  action,
  submitLabel,
  includeStoryTitle = false
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  includeStoryTitle?: boolean;
}) {
  return (
    <form action={action} className={styles.form}>
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
      <label>
        Chapter title
        <input name="title" type="text" required />
      </label>
      <ChapterEditor />
      <button type="submit" className={`btn btn--primary ${styles.submit}`}>
        {submitLabel}
      </button>
    </form>
  );
}
