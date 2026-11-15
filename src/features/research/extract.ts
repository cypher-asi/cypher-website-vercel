/**
 * Finds the sources a post cites. Posts cite with numbered links in the text,
 * `[3](https://…)`, and list them under a `## Sources` (or Notes, References)
 * heading as `3. Publisher, [Title](https://…), detail.` The list is the
 * source of truth; a numbered link with no list entry still counts, with only
 * its URL known.
 */

export interface ExtractedSource {
  number: number;
  url: string;
  urlKey: string;
  domain: string;
  title: string;
  publisher: string;
  detail: string;
  dateLabel: string;
}

const SECTION_RE = /^#{1,6}\s+(sources|notes|references)\s*:?\s*$/i;
const HEADING_RE = /^#{1,6}\s/;
const ITEM_RE = /^\s*(\d{1,3})\.\s+(.*)$/;
/** A Markdown link; the URL may hold one level of balanced parentheses, as Wikipedia's do. */
const LINK_SOURCE = String.raw`\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)\)`;
const INLINE_CITATION_RE = new RegExp(String.raw`\[(\d{1,3})\]\(((?:[^()\s]|\([^()\s]*\))+)\)`, 'g');

const MONTH = String.raw`(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)`;
const DATE_RE = new RegExp(String.raw`\b${MONTH}\.?\s+(?:\d{1,2},\s+)?\d{4}\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:19|20)\d{2}\b`);

const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref_src)$/i;

/** The host a URL points at, without `www.`. */
export function urlDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * The key two citations of the same page share: host without `www.`, path
 * without a trailing slash, and the query minus tracking parameters. Scheme
 * and fragment don't matter.
 */
export function normalizeUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname.replace(/\/+$/, '') || '';
  const params = [...parsed.searchParams.entries()]
    .filter(([name]) => !TRACKING_PARAMS.test(name))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.length ? `?${new URLSearchParams(params).toString()}` : '';
  return `${host}${path}${query}`;
}

/** Splits the body around its sources section, so readers can show the list on its own. */
export function splitSourcesSection(markdown: string): { body: string; section: string } {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => SECTION_RE.test(line.trim()));
  if (start === -1) return { body: markdown, section: '' };
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (HEADING_RE.test(lines[i].trim())) {
      end = i;
      break;
    }
  }
  return {
    body: [...lines.slice(0, start), ...lines.slice(end)].join('\n').trimEnd(),
    section: lines.slice(start + 1, end).join('\n'),
  };
}

const clean = (value: string): string =>
  value
    .trim()
    .replace(/^[,;:.\s]+/, '')
    .replace(/[,;:\s]+$/, '')
    .replace(/\.$/, '')
    .trim();

function parseListItem(number: number, rest: string): ExtractedSource | null {
  const link = new RegExp(LINK_SOURCE).exec(rest);
  if (!link) return null;
  const urlKey = normalizeUrl(link[2]);
  if (!urlKey) return null;
  const publisher = clean(rest.slice(0, link.index));
  const detail = clean(rest.slice(link.index + link[0].length));
  return {
    number,
    url: link[2],
    urlKey,
    domain: urlDomain(link[2]),
    title: link[1].trim(),
    publisher,
    detail,
    dateLabel: DATE_RE.exec(detail)?.[0] ?? '',
  };
}

/** Every numbered source a post cites, in number order. */
export function extractSources(markdown: string): ExtractedSource[] {
  const { body, section } = splitSourcesSection(markdown);
  const byNumber = new Map<number, ExtractedSource>();

  for (const line of section.split('\n')) {
    const item = ITEM_RE.exec(line);
    if (!item) continue;
    const number = Number(item[1]);
    if (byNumber.has(number)) continue;
    const source = parseListItem(number, item[2]);
    if (source) byNumber.set(number, source);
  }

  for (const match of body.matchAll(INLINE_CITATION_RE)) {
    const number = Number(match[1]);
    if (number < 1 || byNumber.has(number)) continue;
    const urlKey = normalizeUrl(match[2]);
    if (!urlKey) continue;
    byNumber.set(number, {
      number,
      url: match[2],
      urlKey,
      domain: urlDomain(match[2]),
      title: '',
      publisher: '',
      detail: '',
      dateLabel: '',
    });
  }

  return [...byNumber.values()].sort((a, b) => a.number - b.number);
}
