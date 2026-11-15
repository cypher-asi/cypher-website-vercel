import type { Element, ElementContent, Root, Text } from 'hast';

/** Where a sentence ends: terminal punctuation, any closing quotes or brackets, then whitespace. */
const SENTENCE_END = /[.!?]["'”’)\]]*\s+/g;

/** The source a link cites, when its whole text is a number the post cites, like `[3](https://…)`. */
export function citedNumber(node: ElementContent, cited: ReadonlySet<number>): number | null {
  if (node.type !== 'element' || node.tagName !== 'a' || node.children.length !== 1) return null;
  const [child] = node.children;
  if (child.type !== 'text' || !/^\d{1,3}$/.test(child.value)) return null;
  const number = Number(child.value);
  return cited.has(number) ? number : null;
}

const isBlank = (nodes: ElementContent[]): boolean =>
  nodes.every((node) => node.type === 'text' && !node.value.trim());

const text = (value: string): Text => ({ type: 'text', value });

/** Where the last sentence in `value` starts, or -1 if none does. */
function lastSentenceStart(value: string): number {
  let start = -1;
  for (const match of value.matchAll(SENTENCE_END)) start = match.index + match[0].length;
  return start;
}

/**
 * Wraps each cited statement in an element's children, with its citations,
 * in a span listing the sources it cites. A statement runs back from its
 * citation to the previous citation or the start of its sentence, whichever
 * is nearer; citations in a row share one statement.
 */
function wrapStatements(children: ElementContent[], cited: ReadonlySet<number>, className: string): ElementContent[] {
  const out: ElementContent[] = [];
  let statement: ElementContent[] = [];
  let last: Element | null = null;

  for (const node of children) {
    const number = citedNumber(node, cited);
    if (number === null) {
      if (node.type === 'text') {
        const start = lastSentenceStart(node.value);
        if (start !== -1) {
          out.push(...statement, text(node.value.slice(0, start)));
          statement = node.value.slice(start) ? [text(node.value.slice(start))] : [];
          last = null;
          continue;
        }
      }
      statement.push(node);
      continue;
    }

    if (last && isBlank(statement)) {
      last.children.push(...statement, node);
      last.properties.dataCites = `${String(last.properties.dataCites)} ${number}`;
    } else {
      last = {
        type: 'element',
        tagName: 'span',
        properties: { className: [className], dataCites: String(number) },
        children: [...statement, node],
      };
      out.push(last);
    }
    statement = [];
  }
  out.push(...statement);
  return out;
}

function visit(node: Root | Element, cited: ReadonlySet<number>, className: string): void {
  for (const child of node.children) {
    if (child.type === 'element') visit(child, cited, className);
  }
  if (node.type === 'element' && node.children.some((child) => citedNumber(child, cited) !== null)) {
    node.children = wrapStatements(node.children, cited, className);
  }
}

/** A rehype plugin marking up cited statements; see `wrapStatements`. */
export function rehypeCitedStatements({ cited, className }: { cited: ReadonlySet<number>; className: string }) {
  return (tree: Root): void => visit(tree, cited, className);
}
