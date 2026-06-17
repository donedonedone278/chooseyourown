'use client';

import { useState, useTransition } from 'react';
import {
  Heart,
  Laugh,
  Rocket,
  Search,
  Skull,
  Wand,
  type LucideIcon
} from 'lucide-react';

import {
  addChapterTagAction,
  removeChapterTagAction,
  suggestTagsAction
} from '@/actions/tag-actions';
import styles from './chapter-tags.module.css';

// Minimal local mapping from a seeded official tag's icon name to its glyph.
// The plan notes a shared <Stat>/icon component lands later; swap to it then.
const ICONS: Record<string, LucideIcon> = {
  Skull: Skull,
  Heart: Heart,
  Search: Search,
  Laugh: Laugh,
  Wand: Wand,
  Rocket: Rocket
};

export type ChapterTagView = {
  chapterTagId: string;
  tagId: string;
  name: string;
  isOfficial: boolean;
  icon: string | null;
};

export type TagSuggestion = { id: string; name: string; isOfficial: boolean; icon: string | null };

export function ChapterTags({
  storyId,
  chapterId,
  tags,
  canAdd,
  canRemove
}: {
  storyId: string;
  chapterId: string;
  tags: ChapterTagView[];
  canAdd: boolean;
  canRemove: boolean;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [isPending, startTransition] = useTransition();

  async function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    const results = await suggestTagsAction(value);
    setSuggestions(results);
  }

  function submitTag(name: string) {
    if (!name.trim()) return;
    const formData = new FormData();
    formData.set('name', name);
    startTransition(async () => {
      await addChapterTagAction(storyId, chapterId, formData);
      setQuery('');
      setSuggestions([]);
    });
  }

  function handleRemove(tagId: string) {
    startTransition(async () => {
      await removeChapterTagAction(storyId, chapterId, tagId);
    });
  }

  return (
    <section aria-label="Tags" className={styles.section}>
      <ul className={styles.list}>
        {tags.map((tag) => {
          const Icon = tag.isOfficial && tag.icon ? ICONS[tag.icon] : undefined;
          return (
            <li key={tag.chapterTagId} className={`${styles.tag} ${tag.isOfficial ? styles.officialTag : ''}`}>
              {Icon ? <Icon size={14} aria-hidden="true" /> : null}
              <span>{tag.name}</span>
              {canRemove ? (
                <button
                  type="button"
                  className={styles.removeButton}
                  aria-label={`Remove ${tag.name}`}
                  onClick={() => handleRemove(tag.tagId)}
                  disabled={isPending}
                >
                  ×
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {canAdd ? (
        <form
          className={styles.addForm}
          onSubmit={(event) => {
            event.preventDefault();
            submitTag(query);
          }}
        >
          <label>
            Add a tag
            <input
              type="text"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              disabled={isPending}
            />
          </label>
          <button type="submit" className="btn btn--secondary" disabled={isPending || !query.trim()}>
            Add
          </button>
          {suggestions.length > 0 ? (
            <ul className={styles.suggestions}>
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    className={styles.suggestionButton}
                    onClick={() => submitTag(suggestion.name)}
                  >
                    {suggestion.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
