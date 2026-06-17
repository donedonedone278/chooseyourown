'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import styles from './header-shell.module.css';

const HIDE_THRESHOLD = 64;

export function HeaderShell({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      if (ticking.current) {
        return;
      }
      ticking.current = true;
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;

        if (currentScrollY <= HIDE_THRESHOLD) {
          setHidden(false);
        } else if (currentScrollY > lastScrollY.current) {
          setHidden(true);
        } else if (currentScrollY < lastScrollY.current) {
          setHidden(false);
        }

        lastScrollY.current = currentScrollY;
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return <div className={`${styles.shell}${hidden ? ` ${styles.hidden}` : ''}`}>{children}</div>;
}
