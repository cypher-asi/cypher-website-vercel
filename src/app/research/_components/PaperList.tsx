import Link from 'next/link';
import styles from '@/features/terminal/Workspace.module.css';
import { papers } from './papers';

/** Every whitepaper, newest first, set like the home page's Research rows. */
export function PaperList({ activeSlug }: { activeSlug?: string }) {
  return (
    <ol className={styles.rows}>
      {papers.map((paper) => (
        <li key={paper.slug}>
          <Link
            className={styles.row}
            href={`/research/${paper.slug}`}
            aria-current={paper.slug === activeSlug ? 'page' : undefined}
          >
            <span className={styles.rowDate}>{paper.year}</span>
            {!paper.available && <span className={styles.rowCompany}>coming soon</span>}
            <span className={styles.rowTitle}>{paper.title}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
