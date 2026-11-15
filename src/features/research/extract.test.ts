// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractSources, normalizeUrl, splitSourcesSection } from './extract';

const thesis = readFileSync(
  new URL('./fixtures/the-industrialization-of-intelligence.md', import.meta.url),
  'utf8',
);

describe('normalizeUrl', () => {
  it('ignores scheme, www, fragment, trailing slash and tracking parameters', () => {
    expect(normalizeUrl('https://www.Example.com/a/b/?utm_source=x&q=1#top')).toBe('example.com/a/b?q=1');
    expect(normalizeUrl('http://example.com/a/b?q=1')).toBe('example.com/a/b?q=1');
  });

  it('sorts query parameters so their order does not matter', () => {
    expect(normalizeUrl('https://a.com/?b=2&a=1')).toBe(normalizeUrl('https://a.com/?a=1&b=2'));
  });

  it('rejects non-web URLs', () => {
    expect(normalizeUrl('mailto:someone@example.com')).toBeNull();
    expect(normalizeUrl('not a url')).toBeNull();
  });
});

describe('extractSources', () => {
  it('reads every entry of the thesis sources list once', () => {
    const sources = extractSources(thesis);
    expect(sources).toHaveLength(26);
    expect(sources.map((s) => s.number)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
  });

  it('splits an entry into publisher, title, url, detail and date', () => {
    const s8 = extractSources(thesis).find((s) => s.number === 8)!;
    expect(s8).toMatchObject({
      publisher: 'Anthropic PBC',
      title: 'Form S-1/A',
      url: 'https://www.sec.gov/Archives/edgar/data/2130357/000162828026072484/anthropicpbc-sx1ax2.htm',
      domain: 'sec.gov',
      detail: 'SEC, Nov 10, 2026',
      dateLabel: 'Nov 10, 2026',
    });
  });

  it('falls back to inline citations that have no list entry', () => {
    const sources = extractSources('Compute is physical.[1](https://iea.org/x) More.[2](https://arxiv.org/abs/1)');
    expect(sources).toEqual([
      expect.objectContaining({ number: 1, url: 'https://iea.org/x', domain: 'iea.org', title: '' }),
      expect.objectContaining({ number: 2, url: 'https://arxiv.org/abs/1', domain: 'arxiv.org' }),
    ]);
  });

  it('prefers the list entry over the inline link for the same number', () => {
    const md = 'Text.[1](https://a.com/inline)\n\n## Notes\n\n1. Pub, [Title](https://a.com/listed), 2024.\n';
    expect(extractSources(md)).toEqual([
      expect.objectContaining({ number: 1, url: 'https://a.com/listed', publisher: 'Pub', dateLabel: '2024' }),
    ]);
  });

  it('keeps URLs with balanced parentheses whole', () => {
    const md = '## References\n\n1. Wikipedia, [Moore](https://en.wikipedia.org/wiki/Moore_(law)), 2020.';
    expect(extractSources(md)[0].url).toBe('https://en.wikipedia.org/wiki/Moore_(law)');
  });

  it('returns nothing for a post without citations', () => {
    expect(extractSources('# Hello\n\nJust [a link](https://x.com).')).toEqual([]);
  });
});

describe('splitSourcesSection', () => {
  it('removes the sources section and keeps what follows it', () => {
    const md = 'Intro.\n\n## Sources\n\n1. A, [B](https://c.com).\n\n## Appendix\n\nMore.';
    const { body, section } = splitSourcesSection(md);
    expect(body).toBe('Intro.\n\n## Appendix\n\nMore.');
    expect(section).toContain('1. A, [B](https://c.com).');
  });

  it('leaves a body without a sources section alone', () => {
    expect(splitSourcesSection('Only text.').body).toBe('Only text.');
  });
});
