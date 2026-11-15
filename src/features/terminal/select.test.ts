// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { companyById } from '@/lib/site';
import type { WritingItem } from './data';
import { selectWriting } from './select';

const item = (site: string, slug: string, publishedAt: string): WritingItem => ({
  id: `${site}-${slug}`,
  site,
  kind: 'news',
  slug,
  title: slug,
  summary: '',
  publishedAt,
  canonicalUrl: `https://${site}.example/news/${slug}`,
  href: `/writing/${site}/news/${slug}`,
});

const feed = [
  item('zode', 'latest', '2026-11-15T00:00:00Z'),
  item('other', 'middle', '2026-11-10T00:00:00Z'),
  item('zode', 'oldest', '2026-11-01T00:00:00Z'),
];

const ref = ({ site, kind, slug }: { site: string; kind: string; slug: string }) => ({ site, kind, slug });

describe('selectWriting', () => {
  it('lists every site and opens the latest post', () => {
    const { rows, open } = selectWriting(feed, null);
    expect(rows.map((row) => row.slug)).toEqual(['latest', 'middle', 'oldest']);
    expect(open && ref(open)).toEqual({ site: 'zode', kind: 'news', slug: 'latest' });
  });

  it('labels each row with its company', () => {
    const { rows } = selectWriting(feed, null);
    expect(rows[0].company).toBe('ZODE');
  });

  it("narrows to a company's posts and opens its latest", () => {
    const { rows, open } = selectWriting([feed[1], feed[0], feed[2]], companyById('zode'));
    expect(rows.map((row) => row.slug)).toEqual(['latest', 'oldest']);
    expect(open?.slug).toBe('latest');
  });

  it('opens the target over the latest post, even outside the filter', () => {
    const target = { site: 'other', kind: 'news', slug: 'middle' };
    expect(selectWriting(feed, null, target).open).toBe(target);
    expect(selectWriting(feed, companyById('zode'), target).open).toBe(target);
  });

  it('lists nothing for a company without a connected site', () => {
    const { rows, open } = selectWriting(feed, companyById('aura'));
    expect(rows).toEqual([]);
    expect(open).toBeUndefined();
  });

  it('opens nothing when the feed is empty or unavailable', () => {
    expect(selectWriting([], null).open).toBeUndefined();
    expect(selectWriting(null, null)).toEqual({ rows: [], open: undefined });
  });
});
