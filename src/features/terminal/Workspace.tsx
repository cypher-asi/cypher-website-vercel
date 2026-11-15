import Link from 'next/link';
import { SITE, companyLabelForSite, type Company } from '@/lib/site';
import { CompanyList } from './CompanyList';
import { Frame } from './Frame';
import { Panel } from './Panel';
import { Reader } from './Reader';
import { SourcesList } from './SourcesPanel';
import { WritingList } from './WritingList';
import { loadCounts, loadFeed, loadPost, type WritingPost } from './data';
import { selectWriting, type PostRef } from './select';
import styles from './Workspace.module.css';

/**
 * The home workspace: Research over Companies on the left, the open post in
 * the middle, and its sources on the right. Opens `target`, or else the
 * latest post (of `company`, when set).
 */
export async function Workspace({
  company,
  target,
}: {
  company: Company | null;
  target?: PostRef;
}) {
  const [feed, counts] = await Promise.all([loadFeed(), loadCounts()]);
  const { rows, open } = selectWriting(feed, company, target);
  const post: WritingPost | null | 'unavailable' = open ? await loadPost(open.site, open.kind, open.slug) : null;
  const query = company ? `company=${company.id}` : '';

  return (
    <Frame className={styles.workspace}>
      <div className={styles.left}>
        <Panel
          title="Research"
          className={styles.writing}
          meta={company ? `${company.label} · ${rows.length}` : rows.length}
        >
          {feed === null ? (
            <p className={styles.empty}>Research is unavailable right now.</p>
          ) : rows.length ? (
            <WritingList rows={rows} activeId={post && post !== 'unavailable' ? post.id : null} query={query} />
          ) : (
            <p className={styles.empty}>No research yet.</p>
          )}
        </Panel>
        <Panel
          title="Companies"
          className={styles.companies}
          meta={
            <Link className={styles.panelLink} href="/companies">
              grid ↗
            </Link>
          }
        >
          <CompanyList companies={SITE.companies} counts={counts} activeId={company?.id ?? null} />
        </Panel>
      </div>

      <Panel title="Read" className={styles.reader} meta={post && post !== 'unavailable' ? <kbd>j / k</kbd> : undefined}>
        {post === 'unavailable' ? (
          <p className={styles.empty}>This post couldn&apos;t be loaded. Please try again.</p>
        ) : post ? (
          <Reader post={post} company={companyLabelForSite(post.site)} />
        ) : (
          <p className={styles.empty}>Nothing to read yet.</p>
        )}
      </Panel>

      <Panel
        title="Sources"
        className={styles.sourcesPanel}
        meta={
          <Link className={styles.panelLink} href="/research/sources">
            index ↗
          </Link>
        }
      >
        {post && post !== 'unavailable' ? (
          <SourcesList sources={post.sources} />
        ) : (
          <p className={styles.empty}>Open a post to see its sources.</p>
        )}
      </Panel>
    </Frame>
  );
}
