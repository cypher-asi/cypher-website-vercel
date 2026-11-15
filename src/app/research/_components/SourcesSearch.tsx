import { MAX_SEARCH_LENGTH } from '@/features/research';
import styles from './SourcesSearch.module.css';

/** Searches the sources index at /research/sources. */
export function SourcesSearch({ query = '' }: { query?: string }) {
  return (
    <form className={styles.search} action="/research/sources" role="search">
      <label className={styles.label} htmlFor="sources-q">
        Search sources
      </label>
      <input
        id="sources-q"
        className={styles.input}
        name="q"
        defaultValue={query}
        maxLength={MAX_SEARCH_LENGTH}
        placeholder="Search sources"
        autoComplete="off"
      />
    </form>
  );
}
