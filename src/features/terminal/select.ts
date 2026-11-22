import { companyLabelForSite, type Company } from '@/lib/site';
import type { WritingItem } from './data';

export type WritingRow = WritingItem & { company: string };
export type PostRef = Pick<WritingItem, 'slug'>;

/**
 * The Writing rows to list, `company`'s posts when one is chosen, and the post
 * to open: `target`, or else the latest row. The feed comes newest first.
 */
export function selectWriting(
  feed: WritingItem[] | null,
  company: Company | null,
  target?: PostRef,
): { rows: WritingRow[]; open: PostRef | undefined } {
  const rows = (feed ?? [])
    .filter((item) => !company || item.site === company.siteId)
    .map((item) => ({ ...item, company: companyLabelForSite(item.site) }));
  return { rows, open: target ?? rows[0] };
}
