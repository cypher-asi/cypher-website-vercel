// @vitest-environment node
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OPENAPI } from './_lib/openapi';

const routeFile = (path: string): string => {
  const dir = path
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (segment === '{path}') return '[...path]';
      return segment.replace(/^\{(.+)\}$/, '[$1]');
    })
    .join('/');
  return new URL(`./${dir}/route.ts`, import.meta.url).pathname;
};

describe('openapi.json', () => {
  it('documents only paths that have a route handler', () => {
    for (const path of Object.keys(OPENAPI.paths)) {
      expect(existsSync(routeFile(path)), `${path} has no route at ${routeFile(path)}`).toBe(true);
    }
  });

  it('documents every method each route exports', async () => {
    for (const [path, item] of Object.entries(OPENAPI.paths)) {
      const route = await import(/* @vite-ignore */ routeFile(path));
      const documented = Object.keys(item).filter((key) => key !== 'parameters').map((m) => m.toUpperCase());
      const exported = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'].filter((method) => method in route);
      expect(exported.sort(), path).toEqual(documented.sort());
    }
  });
});
