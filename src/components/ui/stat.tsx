'use client';

import { useState } from 'react';

import { STAT_KINDS, type StatKind } from '@/components/ui/icons';
import styles from './stat.module.css';

/**
 * Presentational "icon + number" stat, e.g. a like count. Without `explain`
 * this stays a plain `<span>` — safe to nest inside a `<Link>` (e.g.
 * choice-list), since a nested `<button>` there would be invalid HTML and
 * fight card navigation. With `explain`, the glyph becomes a tappable button
 * that reveals its noun label — a touch-friendly stand-in for the desktop-only
 * `title` hover, for standalone stats (profile stats row, reader Reactions).
 */
export function Stat({
  kind,
  value,
  active = false,
  explain = false,
  className
}: {
  kind: StatKind;
  value: number;
  /** When true, fills the icon with the kind's accent (its "picked" state). */
  active?: boolean;
  /** Opt-in tap-to-reveal label popup. Only for standalone stats, never inside a Link. */
  explain?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { icon: Icon, noun, plural, accent } = STAT_KINDS[kind];
  const label = `${value} ${value === 1 ? noun : plural ?? `${noun}s`}`;
  const picked = active ? accent : undefined;

  const iconEl = (
    <Icon
      size={14}
      aria-hidden="true"
      fill={picked ? picked.fill : 'none'}
      stroke={picked ? picked.stroke : 'currentColor'}
    />
  );

  if (!explain) {
    return (
      <span title={label} aria-label={label} className={[styles.stat, className].filter(Boolean).join(' ')}>
        {iconEl}
        {value}
      </span>
    );
  }

  return (
    <span className={[styles.statWrap, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        title={label}
        aria-label={label}
        className={styles.stat}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
      >
        {iconEl}
        {value}
      </button>
      {open ? (
        <span className={styles.popup} aria-hidden="true">
          {value === 1 ? noun : plural ?? `${noun}s`}
        </span>
      ) : null}
    </span>
  );
}
