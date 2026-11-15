'use client';

import { useRef, type ReactNode, type SyntheticEvent } from 'react';
import { sourceAnchor } from './SourcesPanel';

/** The Sources panel entries a statement cites. */
const entriesFor = (statement: Element): HTMLElement[] =>
  (statement.getAttribute('data-cites') ?? '')
    .split(' ')
    .map((number) => document.getElementById(sourceAnchor(Number(number))))
    .filter((entry): entry is HTMLElement => entry !== null);

/** Scrolls an entry into view within its own panel, never moving the statement that points at it. */
function reveal(entry: HTMLElement, statement: Element): void {
  let scroller = entry.parentElement;
  while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
  if (!scroller || scroller.contains(statement)) return;
  const box = entry.getBoundingClientRect();
  const view = scroller.getBoundingClientRect();
  if (box.top < view.top) scroller.scrollBy({ top: box.top - view.top - 8, behavior: 'smooth' });
  else if (box.bottom > view.bottom) scroller.scrollBy({ top: box.bottom - view.bottom + 8, behavior: 'smooth' });
}

/**
 * The post body. Hovering or focusing a cited statement (marked up by
 * `rehypeCitedStatements`) lights it up along with the sources it cites.
 */
export function CitedProse({ className, children }: { className: string; children: ReactNode }) {
  const active = useRef<Element | null>(null);

  const show = (statement: Element | null) => {
    if (statement === active.current) return;
    if (active.current) {
      active.current.removeAttribute('data-active');
      for (const entry of entriesFor(active.current)) entry.removeAttribute('data-active');
    }
    active.current = statement;
    if (!statement) return;
    statement.setAttribute('data-active', '');
    const entries = entriesFor(statement);
    for (const entry of entries) entry.setAttribute('data-active', '');
    if (entries[0]) reveal(entries[0], statement);
  };

  const track = (event: SyntheticEvent) =>
    show(event.target instanceof Element ? event.target.closest('[data-cites]') : null);

  return (
    <div className={className} onPointerOver={track} onFocus={track} onPointerLeave={() => show(null)} onBlur={() => show(null)}>
      {children}
    </div>
  );
}
