import type { Metadata } from 'next';
import Link from 'next/link';
import { MAX_SEARCH_LENGTH, searchSources, type ResearchSource } from '@/features/research';
import { writingHref } from '@/features/terminal/data';
import { companyLabelForSite } from '@/lib/site';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Sources | Research | Cypher',
  description: 'Every source cited across the writing of Cypher and its companies, searchable in one index.',
};

const LIMIT = 100;

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function SourcesIndex({ searchParams }: { searchParams: SearchParams }) {
  const { q: raw } = await searchParams;
  const q = (typeof raw === 'string' ? raw : '').slice(0, MAX_SEARCH_LENGTH);
  let sources: ResearchSource[] | null;
  try {
    sources = await searchSources({ q, limit: LIMIT });
  } catch (error) {
    console.error('[sources] search failed', error);
    sources = null;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.command}>
          <span className={styles.prompt}>$</span> grep -ri {q ? `"${q}"` : '.'} ~/research/sources
        </p>
        <h1 className={styles.heading}>Sources</h1>
        <p className={styles.subtitle}>
          Every source cited across the writing, indexed once per page and linked to the posts that cite it.
        </p>
        <form className={styles.search} action="/research/sources" role="search">
          <label className={styles.searchLabel} htmlFor="sources-q">
            search&gt;
          </label>
          <input
            id="sources-q"
            className={styles.searchInput}
            name="q"
            defaultValue={q}
            maxLength={MAX_SEARCH_LENGTH}
            placeholder='coreweave, "open models", sec.gov'
            autoComplete="off"
          />
        </form>
      </header>

      {sources === null ? (
        <p className={styles.empty}>The index is unavailable right now. Please try again.</p>
      ) : sources.length === 0 ? (
        <p className={styles.empty}>{q ? `No sources match "${q}".` : 'No sources indexed yet.'}</p>
      ) : (
        <>
          <p className={styles.count}>
            {sources.length === LIMIT ? `first ${LIMIT}` : sources.length} {sources.length === 1 ? 'source' : 'sources'}
          </p>
          <ol className={styles.list}>
            {sources.map((source) => (
              <li key={source.id} className={styles.item}>
                <p className={styles.itemMeta}>
                  {source.publisher && <span className={styles.publisher}>{source.publisher}</span>}
                  <span>{source.domain}</span>
                  {source.dateLabel && <span>{source.dateLabel}</span>}
                </p>
                <a className={styles.title} href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title || source.url}
                </a>
                <p className={styles.citedBy}>
                  cited in{' '}
                  {source.citedBy.map((post, i) => (
                    <span key={`${post.site}/${post.kind}/${post.slug}`}>
                      {i > 0 && ', '}
                      <Link href={writingHref(post.site, post.kind, post.slug)}>
                        {companyLabelForSite(post.site)}: {post.title}
                      </Link>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
