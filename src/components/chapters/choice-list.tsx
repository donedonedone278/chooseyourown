'use client';

import Link from 'next/link';

import { useLocalReadIds } from '@/components/chapters/read-marker';
import { officialTagIcon } from '@/components/ui/icons';
import { Stat } from '@/components/ui/stat';
import styles from './chapter-reader.module.css';

const MAX_VISIBLE_TAGS = 4;

export type ChoiceTag = { tagId: string; name: string; isOfficial: boolean; icon: string | null };

export type RealizedChoice = {
  kind: 'realized';
  optionId: string;
  childId: string;
  label: string;
  likeCount: number;
  viewCount: number;
  descendantCount: number;
  read: boolean;
  tags: ChoiceTag[];
};

export type PromptChoice = {
  kind: 'prompt';
  optionId: string;
  label: string;
};

export type ChoiceItem = RealizedChoice | PromptChoice;

/**
 * Renders the chapter's choice list, split into two visually divided groups:
 * **written** paths (realized choices, with stats + read-dimming) above, and the
 * **write-the-next-chapter** affordances below — the author's unwritten
 * suggestions ("✎ write this" prompts) plus the always-present "create your own
 * option…" card. The divider keeps suggestions from blending into the written
 * options (a read/dimmed written card otherwise looks much like a muted prompt).
 *
 * A choice is read if the server says so (`choice.read`, signed-in cross-device
 * truth via `getReadChapterIds`) OR the local overlay does (instant client mark,
 * also what keeps Back-navigation fresh). Read choices are dimmed (visited-link
 * metaphor) rather than labelled with text — see the `.read` modifier.
 */
export function ChoiceList({
  storyId,
  chapterId,
  choices,
  userId
}: {
  storyId: string;
  /** The chapter these choices belong to — unclaimed prompts link to its `/new` route. */
  chapterId: string;
  choices: ChoiceItem[];
  userId?: string | null;
}) {
  const { has: isReadLocally } = useLocalReadIds(userId);

  const realized = choices.filter((choice): choice is RealizedChoice => choice.kind === 'realized');
  const prompts = choices.filter((choice): choice is PromptChoice => choice.kind === 'prompt');

  function renderRealized(choice: RealizedChoice) {
    const read = choice.read || isReadLocally(choice.childId);
    const visibleTags = choice.tags.slice(0, MAX_VISIBLE_TAGS);
    const overflowCount = choice.tags.length - visibleTags.length;
    return (
      <li
        key={choice.optionId}
        className={read ? `${styles.choiceCard} ${styles.read}` : styles.choiceCard}
        data-read={read ? 'true' : undefined}
      >
        <div className={styles.choiceBody}>
          <Link href={`/stories/${storyId}/chapters/${choice.childId}`} className={styles.choiceTitle}>
            {choice.label}
          </Link>
          {choice.tags.length > 0 ? (
            <ul className={styles.choiceTags}>
              {visibleTags.map((tag) => {
                const Icon = tag.isOfficial ? officialTagIcon(tag.icon) : undefined;
                return (
                  <li key={tag.tagId}>
                    {Icon ? (
                      <span aria-label={tag.name} title={tag.name}>
                        <Icon size={14} aria-hidden="true" />
                      </span>
                    ) : (
                      <span className={styles.choiceTagChip}>{tag.name}</span>
                    )}
                  </li>
                );
              })}
              {overflowCount > 0 ? (
                <li className={styles.choiceTagOverflow}>+{overflowCount}</li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <span className={styles.choiceStats}>
          {read ? <span className="sr-only">Read. </span> : null}
          <Stat kind="likes" value={choice.likeCount} />
          <Stat kind="views" value={choice.viewCount} />
          <Stat kind="descendants" value={choice.descendantCount} />
        </span>
      </li>
    );
  }

  function renderPrompt(choice: PromptChoice) {
    return (
      <li key={choice.optionId} className={`${styles.choiceCard} ${styles.prompt}`} data-kind="prompt">
        <div className={styles.choiceBody}>
          <Link
            href={`/stories/${storyId}/chapters/${chapterId}/new?option=${choice.optionId}`}
            className={styles.choiceTitle}
            aria-label={`Unwritten — write this chapter: ${choice.label}`}
          >
            <span aria-hidden="true">✎ </span>
            {choice.label}
          </Link>
        </div>
      </li>
    );
  }

  return (
    <div className={styles.choiceGroups}>
      {realized.length > 0 ? (
        <ul className={styles.choiceList}>{realized.map(renderRealized)}</ul>
      ) : null}

      {/* Divider — only when there are written paths above to divide from. Marks
          the boundary between "read an existing path" and "write a new one". */}
      {realized.length > 0 ? (
        <p className={styles.choiceDivider}>
          <span aria-hidden="true">✎ </span>write the next chapter
        </p>
      ) : null}

      <ul className={styles.choiceList}>
        {prompts.map(renderPrompt)}

        {/* Always-present open-branch affordance: write a brand-new choice of
            your own (vs. the author's pre-labelled prompts). Links to /new with
            no ?option, so the label is yours to write. */}
        <li className={`${styles.choiceCard} ${styles.prompt} ${styles.createOption}`} data-kind="create">
          <div className={styles.choiceBody}>
            <Link
              href={`/stories/${storyId}/chapters/${chapterId}/new`}
              className={styles.choiceTitle}
              aria-label="Create your own option"
            >
              <span aria-hidden="true">+ </span>
              create your own option…
            </Link>
          </div>
        </li>
      </ul>
    </div>
  );
}
