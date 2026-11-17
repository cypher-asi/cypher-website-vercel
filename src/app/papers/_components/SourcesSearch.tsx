import { MAX_SEARCH_LENGTH } from '@/features/research';
import { SearchField } from './SearchField';
import styles from './SourcesSearch.module.css';

/** Searches the sources index at /papers/sources. */
export function SourcesSearch({ query = '' }: { query?: string }) {
  return (
    <form className={styles.search} action="/papers/sources" role="search">
      <label className={styles.label} htmlFor="sources-q">
        Search sources
      </label>
      <SearchField
        id="sources-q"
        className={styles.input}
        name="q"
        defaultValue={query}
        maxLength={MAX_SEARCH_LENGTH}
        placeholder="Search sources"
      />
    </form>
  );
}
