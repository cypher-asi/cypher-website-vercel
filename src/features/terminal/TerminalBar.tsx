'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SiteLink } from '@/lib/site';
import styles from './TerminalBar.module.css';

/** `/writing/zode/news/x` reads as `~/writing/zode/news/x`; the home workspace is `~/writing`. */
const promptPath = (pathname: string): string => (pathname === '/' ? '~/writing' : `~${pathname.replace(/\/+$/, '')}`);

const isActive = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' || pathname.startsWith('/writing') : pathname === href || pathname.startsWith(`${href}/`);

export function TerminalBar({ wordmark, links }: { wordmark: string; links: SiteLink[] }) {
  const pathname = usePathname() ?? '/';
  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.prompt} aria-label={`${wordmark} home`}>
        <span className={styles.wordmark}>{wordmark.toLowerCase()}</span>
        <span className={styles.sep}>:</span>
        <span className={styles.path}>{promptPath(pathname)}</span>
        <span className={styles.sep}>$</span>
        <span className={styles.cursor} aria-hidden />
      </Link>
      <nav className={styles.links} aria-label="Main">
        {links.map((link) =>
          link.external ? (
            <a key={link.label} className={styles.link} href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label.toLowerCase()}
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
              {link.label.toLowerCase()}
            </Link>
          ),
        )}
      </nav>
    </header>
  );
}
