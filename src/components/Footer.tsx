import Link from 'next/link';
import type { SiteConfig } from '@/lib/site';
import styles from './Footer.module.css';

/** The status line pinned to the bottom of every page. */
export function Footer({ status }: { status: SiteConfig['status'] }) {
  return (
    <footer className={styles.status} aria-label="Site footer">
      <nav className={styles.links} aria-label="Footer">
        {status.links.map((link) => (
          <Link key={link.href} className={styles.link} href={link.href}>
            {link.label}
          </Link>
        ))}
        <a className={styles.link} href={status.social.x} target="_blank" rel="noopener noreferrer">
          x
        </a>
        <a className={styles.link} href={status.social.github} target="_blank" rel="noopener noreferrer">
          github
        </a>
      </nav>
      <span className={styles.copyright}>&copy; 2026 {status.copyrightName}</span>
    </footer>
  );
}
