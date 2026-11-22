// @vitest-environment node
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { nextFreeSlug, slugPrefix, slugify } from './slug';
import { MAX_SLUG_LENGTH, RESERVED_SLUGS, SLUG_RE, isPostSlug, postHref } from './types';

describe('slugify', () => {
  it('lowercases and joins words with single hyphens', () => {
    expect(slugify('  Hello, World!  ')).toBe('hello-world');
    expect(slugify('Gate -- Router   Design')).toBe('gate-router-design');
  });

  it('drops accents', () => {
    expect(slugify('Café Déjà Vu')).toBe('cafe-deja-vu');
  });

  it('is empty when nothing usable is left', () => {
    expect(slugify('!!!')).toBe('');
  });

  it('stays within the length limit without a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(MAX_SLUG_LENGTH - 1)} b`);
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(SLUG_RE.test(slug)).toBe(true);
  });
});

describe('nextFreeSlug', () => {
  it('keeps a free slug', () => {
    expect(nextFreeSlug('hello', new Set(['other']))).toBe('hello');
  });

  it('numbers a taken slug from 2', () => {
    expect(nextFreeSlug('hello', new Set(['hello']))).toBe('hello-2');
    expect(nextFreeSlug('hello', new Set(['hello', 'hello-2', 'hello-3']))).toBe('hello-4');
  });

  it('fills the first gap', () => {
    expect(nextFreeSlug('hello', new Set(['hello', 'hello-3']))).toBe('hello-2');
  });

  it('never hands out a path the app serves itself', () => {
    expect(nextFreeSlug('papers', new Set())).toBe('papers-2');
    expect(nextFreeSlug('api', new Set(['api-2']))).toBe('api-3');
  });

  it('trims a long slug to fit its number', () => {
    const base = 'a'.repeat(MAX_SLUG_LENGTH);
    const slug = nextFreeSlug(base, new Set([base]));
    expect(slug).toBe(`${'a'.repeat(MAX_SLUG_LENGTH - 2)}-2`);
    expect(slug.length).toBe(MAX_SLUG_LENGTH);
  });

  it('keeps every numbered variant under the prefix the repo looks up', () => {
    const base = 'b'.repeat(MAX_SLUG_LENGTH);
    const taken = new Set([base]);
    for (let n = 2; n <= 1000; n++) {
      const slug = nextFreeSlug(base, taken);
      expect(slug.startsWith(slugPrefix(base))).toBe(true);
      expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
      taken.add(slug);
    }
    expect(nextFreeSlug(base, taken).endsWith('-1001')).toBe(true);
  });
});

describe('post URLs', () => {
  it('live at the root', () => {
    expect(postHref('gate-router-design')).toBe('/gate-router-design');
  });

  it('accept post slugs and refuse app paths', () => {
    expect(isPostSlug('gate-router-design')).toBe(true);
    expect(isPostSlug('papers')).toBe(false);
    expect(isPostSlug('Not A Slug')).toBe(false);
    expect(isPostSlug('')).toBe(false);
  });

  it('reserve every top-level route in src/app', () => {
    const appDir = join(__dirname, '../../app');
    const routes = readdirSync(appDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !/^[[(_@]/.test(entry.name))
      .map((entry) => entry.name);
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) expect(RESERVED_SLUGS.has(route), `add "${route}" to RESERVED_SLUGS`).toBe(true);
  });
});
