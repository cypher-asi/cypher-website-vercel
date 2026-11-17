'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { List, X } from 'lucide-react';
import { Frame } from '@/features/terminal/Frame';
import { Panel } from '@/features/terminal/Panel';
import article from '@/features/terminal/Article.module.css';
import { PaperList } from './PaperList';
import { TableOfContents } from './TableOfContents';
import { flattenToc, type TocNode } from './toc';
import styles from './WhitepaperLayout.module.css';

export type { TocNode } from './toc';

interface WhitepaperLayoutProps {
  slug: string;
  title: ReactNode;
  year?: string;
  status?: string;
  author?: string;
  lead?: ReactNode;
  sections: TocNode[];
  children: ReactNode;
}

const READ_ID = 'paper-read';
const CONTENTS_ID = 'paper-contents';

/** Below the frame's stacking breakpoint the panels stop scrolling and the window scrolls instead. */
const STACKED = '(max-width: 760px)';

function readPanel(): HTMLElement | null {
  return window.matchMedia(STACKED).matches ? null : document.getElementById(READ_ID);
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const panel = readPanel();
  if (panel) {
    const top = el.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop - 24;
    panel.scrollTo({ top, behavior: 'smooth' });
    return;
  }
  const header = document.querySelector('header');
  const offset = (header ? header.getBoundingClientRect().height : 64) + 72;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
}

export function WhitepaperLayout({
  slug,
  title,
  year,
  status,
  author,
  lead,
  sections,
  children,
}: WhitepaperLayoutProps) {
  const flat = useMemo(() => flattenToc(sections), [sections]);
  const [activeId, setActiveId] = useState<string | null>(flat[0]?.id ?? null);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [stacked, setStacked] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(STACKED);
    const update = () => setStacked(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Scroll-spy: highlight the section currently nearest the top of the Read panel.
  useEffect(() => {
    if (flat.length === 0) return;
    const els = flat
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Pick the topmost section among those currently in view.
        let bestId: string | null = null;
        let bestTop = Infinity;
        for (const el of els) {
          if (!visible.has(el.id)) continue;
          const top = el.getBoundingClientRect().top;
          if (top < bestTop) {
            bestTop = top;
            bestId = el.id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      {
        root: stacked ? null : document.getElementById(READ_ID),
        rootMargin: stacked ? '-120px 0px -65% 0px' : '0px 0px -65% 0px',
        threshold: [0, 1],
      },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [flat, stacked]);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    setMobileTocOpen(false);
    scrollToHeading(id);
  }, []);

  const meta = [status, author && `By ${author}`, year && !status?.includes(year) ? year : undefined].filter(Boolean);

  return (
    <Frame className={styles.frame}>
      <Panel title="Contents" className={styles.contents} bodyId={CONTENTS_ID}>
        <nav className={styles.toc} aria-label="Table of contents">
          <TableOfContents
            items={sections}
            activeId={activeId}
            onSelect={handleSelect}
            scrollContainerId={CONTENTS_ID}
          />
        </nav>
      </Panel>

      <Panel title="Read" className={styles.read} bodyId={READ_ID}>
        <article className={article.article}>
          <header className={article.header}>
            {meta.length > 0 && (
              <p className={article.meta}>
                {meta.map((item, i) => (
                  <span key={i}>
                    {i > 0 && <span aria-hidden="true">· </span>}
                    {item}
                  </span>
                ))}
              </p>
            )}
            <h1 className={article.title}>{title}</h1>
            {lead && <div className={article.lead}>{lead}</div>}
          </header>

          <div className={styles.mobileToc}>
            <button
              type="button"
              className={styles.mobileTocToggle}
              aria-expanded={mobileTocOpen}
              onClick={() => setMobileTocOpen((v) => !v)}
            >
              {mobileTocOpen ? <X size={14} /> : <List size={14} />}
              <span>Contents</span>
            </button>
            {mobileTocOpen && (
              <nav className={styles.mobileTocPanel} aria-label="Table of contents">
                <TableOfContents items={sections} activeId={activeId} onSelect={handleSelect} />
              </nav>
            )}
          </div>

          {children}
        </article>
      </Panel>

      <Panel title="Papers" className={styles.papers}>
        <PaperList activeSlug={slug} />
      </Panel>
    </Frame>
  );
}
