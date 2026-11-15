// @vitest-environment node
import type { Element, ElementContent, Root } from 'hast';
import { describe, expect, it } from 'vitest';
import { rehypeCitedStatements } from './statements';

const text = (value: string): ElementContent => ({ type: 'text', value });
const cite = (number: number): Element => ({
  type: 'element',
  tagName: 'a',
  properties: { href: `https://example.com/${number}` },
  children: [text(String(number))],
});
const paragraph = (...children: ElementContent[]): Element => ({
  type: 'element',
  tagName: 'p',
  properties: {},
  children,
});

/** Runs the plugin over one paragraph and lists its children as plain text or `[cites: text]` statements. */
function statements(p: Element, cited = [1, 2, 3]): string[] {
  const tree: Root = { type: 'root', children: [p] };
  rehypeCitedStatements({ cited: new Set(cited), className: 'statement' })(tree);
  const flat = (node: ElementContent): string =>
    node.type === 'text' ? node.value : node.type === 'element' ? node.children.map(flat).join('') : '';
  return p.children.map((node) =>
    node.type === 'element' && node.tagName === 'span' ? `[${String(node.properties.dataCites)}: ${flat(node)}]` : flat(node),
  );
}

describe('rehypeCitedStatements', () => {
  it('runs a statement back to the start of its sentence', () => {
    expect(statements(paragraph(text('One idea. Models get cheaper.'), cite(1), text(' Then more.')))).toEqual([
      'One idea. ',
      '[1: Models get cheaper.1]',
      ' Then more.',
    ]);
  });

  it('runs a statement back to the previous citation inside a sentence', () => {
    expect(
      statements(paragraph(text('As models spread,'), cite(1), text(' prices fall,'), cite(2), text(' and use grows.'))),
    ).toEqual(['[1: As models spread,1]', '[2:  prices fall,2]', ' and use grows.']);
  });

  it('keeps inline markup inside the statement', () => {
    const strong: Element = { type: 'element', tagName: 'strong', properties: {}, children: [text('Compute')] };
    expect(statements(paragraph(text('Done. '), strong, text(' is physical.'), cite(3)))).toEqual([
      'Done. ',
      '[3: Compute is physical.3]',
    ]);
  });

  it('gives citations in a row one statement', () => {
    expect(statements(paragraph(text('Both say so.'), cite(1), text(' '), cite(2)))).toEqual(['[1 2: Both say so.1 2]']);
  });

  it('leaves links that cite nothing alone', () => {
    expect(statements(paragraph(text('See'), cite(9), text(' here.')))).toEqual(['See', '9', ' here.']);
  });
});
