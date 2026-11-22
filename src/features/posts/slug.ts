import { MAX_SLUG_LENGTH, isReservedSlug } from './types';

/** A URL slug from free text: lowercase letters and numbers joined by single hyphens. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, '');
}

/** `base` with `-n` appended, `base` trimmed so the whole stays within the length limit. */
function numbered(base: string, n: number): string {
  const suffix = `-${n}`;
  return `${base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/, '')}${suffix}`;
}

/**
 * `base` when no other post uses it and the app doesn't serve that path,
 * otherwise the first free `base-2`, `base-3`, ...
 */
export function nextFreeSlug(base: string, taken: ReadonlySet<string>): string {
  const free = (slug: string) => !taken.has(slug) && !isReservedSlug(slug);
  if (free(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = numbered(base, n);
    if (free(candidate)) return candidate;
  }
}

/**
 * A prefix every numbered variant of `base` starts with, for looking up the
 * slugs that could clash in one query (variants trim `base` to make room).
 */
export const slugPrefix = (base: string): string => base.slice(0, MAX_SLUG_LENGTH - 8).replace(/-+$/, '');
