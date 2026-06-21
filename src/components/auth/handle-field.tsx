'use client';

import { useEffect, useState } from 'react';
import { slugifyHandle } from '@/lib/handles';
import styles from './handle-field.module.css';

type Availability = { status: 'idle' | 'checking' | 'available' | 'unavailable'; reason?: string };

/**
 * Sign-up's required "Handle" field: prefills a slug from the Display name
 * field (until the user edits it directly), then debounce-checks
 * availability against `/api/handles/check` and shows a ✓/✗. Server
 * validation in `signUp` is authoritative — this is a UX nicety only.
 */
export function HandleField({ displayNameInputId }: { displayNameInputId: string }) {
  const [handle, setHandle] = useState('');
  const [touched, setTouched] = useState(false);
  const [availability, setAvailability] = useState<Availability>({ status: 'idle' });

  // Prefill from the Display name field until the user edits the handle directly.
  useEffect(() => {
    if (touched) return;
    const displayNameInput = document.getElementById(displayNameInputId) as HTMLInputElement | null;
    if (!displayNameInput) return;

    const onInput = () => setHandle(slugifyHandle(displayNameInput.value));
    displayNameInput.addEventListener('input', onInput);
    return () => displayNameInput.removeEventListener('input', onInput);
  }, [displayNameInputId, touched]);

  useEffect(() => {
    if (!handle) {
      setAvailability({ status: 'idle' });
      return;
    }

    setAvailability({ status: 'checking' });
    const timer = setTimeout(() => {
      fetch(`/api/handles/check?handle=${encodeURIComponent(handle)}`)
        .then((res) => res.json())
        .then((data: { available: boolean; reason?: string }) => {
          setAvailability({ status: data.available ? 'available' : 'unavailable', reason: data.reason });
        })
        .catch(() => setAvailability({ status: 'idle' }));
    }, 300);

    return () => clearTimeout(timer);
  }, [handle]);

  return (
    <label>
      Handle
      <input
        name="handle"
        type="text"
        required
        value={handle}
        onChange={(event) => {
          setTouched(true);
          setHandle(event.target.value.toLowerCase());
        }}
        aria-describedby="handle-availability"
      />
      <span id="handle-availability" className={styles.availability} role="status">
        {availability.status === 'checking' ? 'Checking…' : null}
        {availability.status === 'available' ? '✓ Available' : null}
        {availability.status === 'unavailable' ? `✗ ${availability.reason ?? 'Unavailable'}` : null}
      </span>
    </label>
  );
}
