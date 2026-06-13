import { ChapterEditor } from '@/components/editor/chapter-editor';

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
    <form action={action}>
      {includeStoryTitle ? (
        <label>
          Story title
          <input name="storyTitle" type="text" required />
        </label>
      ) : null}
      <label>
        Chapter title
        <input name="title" type="text" required />
      </label>
      <ChapterEditor />
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
