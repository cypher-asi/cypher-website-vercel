import 'server-only';
import { db } from '@/lib/db';
import { sourceSyncQueries } from './sync';

/** Indexes the sources a post's body cites; returns how many it cites. */
export async function syncPostSources(postId: string, bodyMd: string): Promise<number> {
  const sql = db();
  const { queries, count } = sourceSyncQueries(sql, postId, bodyMd);
  await sql.transaction(queries);
  return count;
}

export interface CitingPost {
  site: string;
  kind: string;
  slug: string;
  title: string;
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  publisher: string;
  domain: string;
  dateLabel: string;
  citedBy: CitingPost[];
}

export const MAX_SEARCH_LENGTH = 200;

/**
 * Sources cited by published posts, best match first for a query, most
 * recently cited first without one. `q` uses web search syntax ("quoted
 * phrases", -excluded) and also matches part of a domain.
 */
export async function searchSources({
  q = '',
  limit = 50,
  offset = 0,
}: { q?: string; limit?: number; offset?: number } = {}): Promise<ResearchSource[]> {
  const query = q.trim().slice(0, MAX_SEARCH_LENGTH);
  const rows = await db()`
    select rs.id, rs.url, rs.title, rs.publisher, rs.domain, rs.date_label,
      jsonb_agg(distinct jsonb_build_object('site', p.site_id, 'kind', p.kind, 'slug', p.slug, 'title', p.title)) as cited_by,
      case when ${query} = '' then 0 else ts_rank(rs.search, websearch_to_tsquery('english', ${query})) end as rank,
      max(p.published_at) as last_cited
    from research_sources rs
    join post_sources ps on ps.source_id = rs.id
    join posts p on p.id = ps.post_id and p.status = 'published'
    where ${query} = ''
      or rs.search @@ websearch_to_tsquery('english', ${query})
      or position(lower(${query}) in rs.domain) > 0
    group by rs.id
    order by rank desc, last_cited desc, rs.id
    limit ${limit} offset ${offset}
  `;
  return rows.map((row) => ({
    id: String(row.id),
    url: String(row.url),
    title: String(row.title),
    publisher: String(row.publisher),
    domain: String(row.domain),
    dateLabel: String(row.date_label),
    citedBy: row.cited_by as CitingPost[],
  }));
}
