import type { Metadata } from 'next';
import Link from 'next/link';
import { MAX_SEARCH_LENGTH, searchSources, type ResearchSource } from '@/features/research';
import { writingHref } from '@/features/terminal/data';
import { Frame } from '@/features/terminal/Frame';
import { Panel } from '@/features/terminal/Panel';
import { companyLabelForSite } from '@/lib/site';
import { SourcesSearch } from '../_components/SourcesSearch';
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

  const count = sources?.length
    ? `${sources.length === LIMIT ? `first ${LIMIT}` : sources.length} ${sources.length === 1 ? 'source' : 'sources'}`
    : undefined;

  return (
    <Frame className={styles.frame}>
      <Panel title="Search">
        <div className={styles.search}>
          <p className={styles.text}>
            Every source cited across the writing, indexed once per page and linked to the posts that cite it.
          </p>
          <SourcesSearch query={q} />
          {q && (
            <Link className={styles.clear} href="/research/sources">
              Clear search
            </Link>
          )}
        </div>
      </Panel>

      <Panel title="Sources" meta={count}>
        {sources === null ? (
          <p className={styles.empty}>The index is unavailable right now. Please try again.</p>
        ) : sources.length === 0 ? (
          <p className={styles.empty}>{q ? `No sources match "${q}".` : 'No sources indexed yet.'}</p>
        ) : (
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
        )}
      </Panel>
    </Frame>
  );
}
