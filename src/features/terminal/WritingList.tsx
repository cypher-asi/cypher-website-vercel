'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { WritingItem } from './data';
import styles from './Workspace.module.css';

export interface WritingRow extends WritingItem {
  company: string;
}

const withQuery = (href: string, query: string): string => (query ? `${href}?${query}` : href);

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** Posts newest first; `j`/`k` (or the arrow keys) open the next or previous one. */
export function WritingList({ rows, activeId, query }: { rows: WritingRow[]; activeId: string | null; query: string }) {
  const router = useRouter();
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      const step = event.key === 'j' || event.key === 'ArrowDown' ? 1 : event.key === 'k' || event.key === 'ArrowUp' ? -1 : 0;
      if (!step || !rows.length) return;
      const at = rows.findIndex((row) => row.id === activeId);
      const next = rows[Math.min(rows.length - 1, Math.max(0, at === -1 ? 0 : at + step))];
      if (next && next.id !== activeId) {
        event.preventDefault();
        router.push(withQuery(next.href, query), { scroll: false });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, activeId, query, router]);

  return (
    <ol className={styles.rows}>
      {rows.map((row) => {
        const active = row.id === activeId;
        return (
          <li key={row.id}>
            <Link
              ref={active ? activeRef : undefined}
              className={styles.row}
              href={withQuery(row.href, query)}
              aria-current={active ? 'page' : undefined}
              scroll={false}
            >
              <span className={styles.rowMarker} aria-hidden>
                {active ? '>' : ' '}
              </span>
              <span className={styles.rowDate}>{row.publishedAt.slice(0, 10)}</span>
              <span className={styles.rowCompany}>{row.company}</span>
              <span className={styles.rowTitle}>{row.title}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
