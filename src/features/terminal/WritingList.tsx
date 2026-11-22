'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { WritingItem } from './data';
import styles from './Workspace.module.css';

export interface WritingRow extends WritingItem {
  company: string;
}

const withQuery = (href: string, query: string): string => (query ? `${href}?${query}` : href);

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** A click the browser handles itself (new tab, new window, download), not a switch of the open post. */
const isModifiedClick = (event: MouseEvent): boolean =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/** Rows this close to the selected one are fully prefetched, so `j`/`k` and nearby clicks open at once. */
const PREFETCH_RADIUS = 2;

/**
 * Posts newest first; `j`/`k` (or the arrow keys) open the next or previous one.
 *
 * The row a reader picks is highlighted straight away, before the server has
 * answered, and steps with `j`/`k` count from it, so holding a key walks the
 * list rather than waiting on each post.
 */
export function WritingList({ rows, activeId, query }: { rows: WritingRow[]; activeId: string | null; query: string }) {
  const router = useRouter();
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // The row picked but not yet open. Cleared when the server's open post changes.
  const [pending, setPending] = useState<{ id: string; from: string | null } | null>(null);
  const selectedId = pending && pending.from === activeId ? pending.id : activeId;

  // Rows the reader has pointed at, and so is likely to open next.
  const [warm, setWarm] = useState<ReadonlySet<string>>(() => new Set());
  const warmUp = (id: string) => setWarm((ids) => (ids.has(id) ? ids : new Set(ids).add(id)));

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      const step = event.key === 'j' || event.key === 'ArrowDown' ? 1 : event.key === 'k' || event.key === 'ArrowUp' ? -1 : 0;
      if (!step || !rows.length) return;
      const at = rows.findIndex((row) => row.id === selectedId);
      const next = rows[Math.min(rows.length - 1, Math.max(0, at === -1 ? 0 : at + step))];
      if (next && next.id !== selectedId) {
        event.preventDefault();
        setPending({ id: next.id, from: activeId });
        router.push(withQuery(next.href, query), { scroll: false });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, selectedId, activeId, query, router]);

  const selectedIndex = rows.findIndex((row) => row.id === selectedId);

  return (
    <ol className={styles.rows}>
      {rows.map((row, index) => {
        const active = row.id === selectedId;
        const near = selectedIndex !== -1 && Math.abs(index - selectedIndex) <= PREFETCH_RADIUS;
        return (
          <li key={row.id}>
            <Link
              ref={active ? activeRef : undefined}
              className={`${styles.row} ${styles.writingRow}`}
              href={withQuery(row.href, query)}
              aria-current={active ? 'page' : undefined}
              scroll={false}
              // Neighbours are prefetched in full up front; any other row once it's hovered or focused.
              prefetch={(near || warm.has(row.id)) && !active ? true : null}
              onMouseEnter={() => warmUp(row.id)}
              onFocus={() => warmUp(row.id)}
              onTouchStart={() => warmUp(row.id)}
              onClick={(event) => {
                if (!isModifiedClick(event) && row.id !== selectedId) setPending({ id: row.id, from: activeId });
              }}
            >
              <span className={styles.rowTitle}>{row.title}</span>
              <span className={styles.rowCompany}>{row.company}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
