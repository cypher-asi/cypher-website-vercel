import type { ReactNode } from 'react';
import styles from './Workspace.module.css';

/** A bordered terminal pane with a `[ TITLE ]` header and its own scroll. */
export function Panel({
  title,
  meta,
  className,
  bodyId,
  children,
}: {
  title: string;
  meta?: ReactNode;
  className?: string;
  bodyId?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${styles.panel} ${className ?? ''}`} aria-label={title}>
      <header className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>
          <span aria-hidden>[ </span>
          {title}
          <span aria-hidden> ]</span>
        </h2>
        {meta && <div className={styles.panelMeta}>{meta}</div>}
      </header>
      <div className={styles.panelBody} id={bodyId}>
        {children}
      </div>
    </section>
  );
}
