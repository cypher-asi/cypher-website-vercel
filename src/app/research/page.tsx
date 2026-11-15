import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Frame } from '@/features/terminal/Frame';
import { Panel } from '@/features/terminal/Panel';
import panel from '@/features/terminal/Workspace.module.css';
import { papers } from './_components/papers';
import { SourcesSearch } from './_components/SourcesSearch';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Research | Cypher',
  description:
    'Whitepapers and open research on intelligence, distributed systems, and protocols from Cypher.',
};

export default function ResearchIndex() {
  return (
    <Frame className={styles.frame}>
      <Panel title="Papers" meta={papers.length}>
        <div className={styles.list}>
          {papers.map((paper) => (
            <Link key={paper.slug} href={`/research/${paper.slug}`} className={styles.card}>
              <div className={styles.cardMeta}>
                <span>{paper.year}</span>
                {!paper.available && <span className={styles.cardBadge}>coming soon</span>}
                <ArrowUpRight size={16} className={styles.cardIcon} />
              </div>
              <h3 className={styles.cardTitle}>{paper.title}</h3>
              <p className={styles.cardBlurb}>{paper.blurb}</p>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel
        title="Sources"
        meta={
          <Link className={panel.panelLink} href="/research/sources">
            index ↗
          </Link>
        }
      >
        <div className={styles.sources}>
          <p className={styles.sourcesText}>
            Every source cited across the writing of Cypher and its companies, searchable in one index.
          </p>
          <SourcesSearch />
        </div>
      </Panel>
    </Frame>
  );
}
