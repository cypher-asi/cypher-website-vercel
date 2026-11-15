import type { WritingSource } from './data';
import styles from './Workspace.module.css';

export const sourceAnchor = (number: number): string => `source-${number}`;

/** The numbered sources of the open post; a citation in the text jumps to its entry here. */
export function SourcesList({ sources }: { sources: WritingSource[] }) {
  if (!sources.length) return <p className={styles.empty}>This post cites no sources.</p>;
  return (
    <ol className={styles.sources}>
      {sources.map((source) => (
        <li key={source.number} id={sourceAnchor(source.number)} className={styles.source}>
          <span className={styles.sourceNumber}>[{source.number}]</span>
          <div className={styles.sourceBody}>
            {source.publisher && <p className={styles.sourcePublisher}>{source.publisher}</p>}
            <a className={styles.sourceTitle} href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title || source.domain}
            </a>
            <p className={styles.sourceMeta}>
              <span>{source.domain}</span>
              {source.detail && <span>{source.detail}</span>}
              {source.citedBy > 1 && <span className={styles.sourceCited}>cited in {source.citedBy} writings</span>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
