'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { STAT_KINDS, type StatKind } from '@/components/ui/icons';
import styles from './stat.module.css';

// Custom event used so every open Stat popup can hear about a newly-opened
// one and close itself — keeps "only one open at a time" without an app-wide
// context/provider, which wouldn't reach across independently-rendered Stats
// in server components anyway.
const STAT_POPUP_OPEN_EVENT = 'stat-popup:open';

type StatPopupOpenDetail = { id: string };

const POPUP_GAP = 8;

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
  const [position, setPosition] = useState<{ top: number; left: number; flip: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const instanceId = useId();
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

  const close = () => setOpen(false);

  const reposition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const flip = rect.top < 60; // not enough room above — flip below instead.
    setPosition({
      top: flip ? rect.bottom + POPUP_GAP : rect.top - POPUP_GAP,
      left: rect.left + rect.width / 2,
      flip
    });
  };

  // Only one popup open at a time: announce this open to every other Stat,
  // and close this one if a different instance announces an open.
  useEffect(() => {
    if (!open) return;

    const onOtherOpen = (event: Event) => {
      const detail = (event as CustomEvent<StatPopupOpenDetail>).detail;
      if (detail?.id !== instanceId) setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    window.addEventListener(STAT_POPUP_OPEN_EVENT, onOtherOpen);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);

    return () => {
      window.removeEventListener(STAT_POPUP_OPEN_EVENT, onOtherOpen);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, instanceId]);

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
        ref={buttonRef}
        type="button"
        title={label}
        aria-label={label}
        className={styles.stat}
        onClick={() => {
          setOpen((wasOpen) => {
            const next = !wasOpen;
            if (next) {
              reposition();
              window.dispatchEvent(
                new CustomEvent<StatPopupOpenDetail>(STAT_POPUP_OPEN_EVENT, { detail: { id: instanceId } })
              );
            }
            return next;
          });
        }}
      >
        {iconEl}
        {value}
      </button>
      {open && position && typeof document !== 'undefined'
        ? createPortal(
            <span
              data-stat-popup
              role="presentation"
              aria-hidden="true"
              className={styles.popup}
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                transform: position.flip ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
              }}
            >
              {value === 1 ? noun : plural ?? `${noun}s`}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
