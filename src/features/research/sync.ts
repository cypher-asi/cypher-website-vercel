import type { NeonQueryFunction, NeonQueryPromise } from '@neondatabase/serverless';
import { extractSources, type ExtractedSource } from './extract.ts';

type Sql = NeonQueryFunction<false, false>;

/**
 * The statements that index a post's sources, to run in one transaction:
 * each cited URL becomes (or updates) a research source keyed by its
 * normalized URL, and the post's numbered citations are replaced with the
 * ones its body has now. Kept free of app-only imports so scripts can use it.
 */
export function sourceSyncQueries(
  sql: Sql,
  postId: string,
  bodyMd: string,
): { queries: NeonQueryPromise<false, false>[]; count: number } {
  const sources = extractSources(bodyMd);

  // One row per URL: a post may cite the same page under two numbers.
  const unique = new Map<string, ExtractedSource>();
  for (const source of sources) {
    const seen = unique.get(source.urlKey);
    if (!seen || (!seen.title && source.title)) unique.set(source.urlKey, source);
  }
  const rows = [...unique.values()];

  const queries: NeonQueryPromise<false, false>[] = [];
  if (rows.length) {
    queries.push(sql`
      insert into research_sources (url, url_key, title, publisher, domain, date_label)
      select * from unnest(
        ${rows.map((s) => s.url)}::text[], ${rows.map((s) => s.urlKey)}::text[],
        ${rows.map((s) => s.title)}::text[], ${rows.map((s) => s.publisher)}::text[],
        ${rows.map((s) => s.domain)}::text[], ${rows.map((s) => s.dateLabel)}::text[]
      )
      on conflict (url_key) do update set
        title = case when excluded.title <> '' then excluded.title else research_sources.title end,
        publisher = case when excluded.publisher <> '' then excluded.publisher else research_sources.publisher end,
        date_label = case when excluded.date_label <> '' then excluded.date_label else research_sources.date_label end,
        updated_at = now()
    `);
  }
  queries.push(sql`delete from post_sources where post_id = ${postId}`);
  if (sources.length) {
    queries.push(sql`
      insert into post_sources (post_id, number, source_id, detail)
      select ${postId}::uuid, n.number, rs.id, n.detail
      from unnest(
        ${sources.map((s) => s.number)}::int[], ${sources.map((s) => s.urlKey)}::text[],
        ${sources.map((s) => s.detail)}::text[]
      ) as n(number, url_key, detail)
      join research_sources rs on rs.url_key = n.url_key
    `);
  }
  return { queries, count: sources.length };
}
