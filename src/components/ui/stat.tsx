import { STAT_KINDS, type StatKind } from '@/components/ui/icons';
import styles from './stat.module.css';

/**
 * Presentational "icon + number" stat, e.g. a like count. Server-component-safe
 * (no 'use client', no hooks) so it can be used directly from the chapter reader.
 */
export function Stat({
  kind,
  value,
  active = false,
  className
}: {
  kind: StatKind;
  value: number;
  /** When true, fills the icon with the kind's accent (its "picked" state). */
  active?: boolean;
  className?: string;
}) {
  const { icon: Icon, noun, accent } = STAT_KINDS[kind];
  const label = `${value} ${value === 1 ? noun : `${noun}s`}`;
  const picked = active ? accent : undefined;

  return (
    <span title={label} aria-label={label} className={[styles.stat, className].filter(Boolean).join(' ')}>
      <Icon
        size={14}
        aria-hidden="true"
        fill={picked ? picked.fill : 'none'}
        stroke={picked ? picked.stroke : 'currentColor'}
      />
      {value}
    </span>
  );
}
