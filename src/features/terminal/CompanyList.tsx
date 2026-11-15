import Link from 'next/link';
import type { Company } from '@/lib/site';
import styles from './Workspace.module.css';

/**
 * Each company filters the Research panel to its posts. A company with no
 * writing yet links out to its own site instead.
 */
export function CompanyList({
  companies,
  counts,
  activeId,
}: {
  companies: Company[];
  counts: Record<string, number>;
  activeId: string | null;
}) {
  return (
    <ul className={styles.rows}>
      <li>
        <Link className={styles.company} href="/" aria-current={activeId === null ? 'page' : undefined} scroll={false}>
          <span className={styles.rowMarker} aria-hidden>
            {activeId === null ? '>' : ' '}
          </span>
          <span className={styles.companyName}>all</span>
        </Link>
      </li>
      {companies.map((company) => {
        const count = company.siteId ? (counts[company.siteId] ?? 0) : 0;
        const active = company.id === activeId;
        const body = (
          <>
            <span className={styles.rowMarker} aria-hidden>
              {active ? '>' : ' '}
            </span>
            <span className={styles.companyName}>{company.label}</span>
          </>
        );
        return (
          <li key={company.id}>
            {count > 0 ? (
              <Link
                className={styles.company}
                href={`/?company=${company.id}`}
                aria-current={active ? 'page' : undefined}
                scroll={false}
              >
                {body}
              </Link>
            ) : (
              <a className={styles.company} href={company.href} target="_blank" rel="noopener noreferrer">
                {body}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
