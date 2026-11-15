'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TypewriterText, type TypewriterSegment } from '@/components/TypewriterText';
import type { SiteLink } from '@/lib/site';
import styles from './TerminalBar.module.css';

/** The workspace link stays current while a post is open in it. */
const isActive = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' || pathname.startsWith('/writing') : pathname === href || pathname.startsWith(`${href}/`);

export function TerminalBar({ wordmark, links }: { wordmark: string; links: SiteLink[] }) {
  const pathname = usePathname() ?? '/';
  // Bumping the key remounts the typewriter, so clicking the wordmark replays it.
  const [brandKey, setBrandKey] = useState(0);
  const [brandTyped, setBrandTyped] = useState(false);
  const segments: TypewriterSegment[] = useMemo(
    () => [
      { text: '/', style: { color: 'var(--color-text-secondary)' } },
      { text: wordmark, className: styles.brandLetters },
    ],
    [wordmark],
  );

  return (
    <header className={styles.bar}>
      <Link
        href="/"
        className={styles.brandLink}
        aria-label={`${wordmark} home`}
        onClick={() => {
          setBrandTyped(false);
          setBrandKey((key) => key + 1);
        }}
      >
        <TypewriterText
          key={brandKey}
          segments={segments}
          speed={80}
          className={`${styles.brand} ${brandTyped ? styles.brandFilled : ''}`}
          onComplete={() => setBrandTyped(true)}
        />
      </Link>
      <nav className={styles.links} aria-label="Main">
        {links.map((link) =>
          link.external ? (
            <a key={link.label} className={styles.link} href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label}
              <span className={styles.external} aria-hidden>
                ↗
              </span>
            </a>
          ) : (
            <Link
              key={link.label}
              className={styles.link}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ),
        )}
      </nav>
    </header>
  );
}
