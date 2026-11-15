import type { ReactNode } from 'react';
import styles from './Workspace.module.css';

/** The grid of panels every page sits in; `className` sets its columns. */
export function Frame({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={`${styles.frame} ${className ?? ''}`}>{children}</div>;
}
