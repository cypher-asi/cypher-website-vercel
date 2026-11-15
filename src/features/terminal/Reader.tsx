import Markdown, { type Components, type ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { splitSourcesSection } from '@/features/research/extract';
import { PostChart } from './charts/PostChart';
import { CitedProse } from './CitedProse';
import { sourceAnchor } from './SourcesPanel';
import { rehypeCitedStatements } from './statements';
import type { WritingPost } from './data';
import styles from './Reader.module.css';

const isExternal = (href: string | undefined): boolean => Boolean(href && /^https?:\/\//i.test(href));

/** A link whose whole text is a number, like `[3](https://…)`, cites the post's source 3. */
const citationNumber = (children: unknown): number | null =>
  typeof children === 'string' && /^\d{1,3}$/.test(children) ? Number(children) : null;

/** Drops react-markdown's syntax-tree `node` prop, which isn't a DOM attribute. */
function dom<T extends ExtraProps>(props: T): Omit<T, 'node'> {
  const { node, ...rest } = props;
  void node;
  return rest;
}

/** A fenced block in the `chart` language names a chart (charts/PostChart.tsx) to draw in its place. */
function chartName(node: ExtraProps['node']): string | undefined {
  const code = node?.children[0];
  if (code?.type !== 'element' || code.tagName !== 'code') return undefined;
  const classes = code.properties.className;
  if (!Array.isArray(classes) || !classes.includes('language-chart')) return undefined;
  return code.children
    .map((child) => (child.type === 'text' ? child.value : ''))
    .join('')
    .trim();
}

function components(cited: Set<number>): Components {
  return {
    // The post title is the reader's only h1, so a `#` in the body renders one level down.
    h1: (props) => <h2 {...dom(props)} />,
    pre: (props) => {
      const chart = chartName(props.node);
      return chart === undefined ? <pre {...dom(props)} /> : <PostChart name={chart} />;
    },
    a: (props) => {
      const number = citationNumber(props.children);
      if (number !== null && cited.has(number)) {
        return (
          <sup className={styles.citation}>
            <a href={`#${sourceAnchor(number)}`} aria-label={`Source ${number}`}>
              {number}
            </a>
          </sup>
        );
      }
      return isExternal(props.href) ? (
        <a {...dom(props)} target="_blank" rel="noreferrer noopener" />
      ) : (
        <a {...dom(props)} />
      );
    },
    // eslint-disable-next-line @next/next/no-img-element -- uploads are served at their own size from /post-media
    img: (props) => <img {...dom(props)} alt={props.alt ?? ''} loading="lazy" decoding="async" />,
  };
}

const WORDS_PER_MINUTE = 230;
/** Counted the way the ZODE site counts, so a post reads the same length on both. */
const readingMinutes = (markdown: string): number =>
  Math.max(
    1,
    Math.round(markdown.replace(/[#>*_`~[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE),
  );

const postDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

/** First and last initials, or the first two letters of a single name, for the byline avatar. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)).toUpperCase();
}

/** The open post, its sources list left to the Sources panel. Raw HTML in the source is never rendered. */
export function Reader({ post, company }: { post: WritingPost; company: string }) {
  const { body } = splitSourcesSection(post.bodyMd);
  const cited = new Set(post.sources.map((source) => source.number));
  const host = new URL(post.canonicalUrl).host;
  return (
    <article className={styles.article}>
      <header className={styles.header}>
        <p className={styles.meta}>
          <time dateTime={post.publishedAt}>{postDate.format(new Date(post.publishedAt))}</time>
          <span aria-hidden="true">·</span>
          <span>{company}</span>
          <span aria-hidden="true">·</span>
          <span className={styles.kind}>{post.kind}</span>
          <span aria-hidden="true">·</span>
          <a href={post.canonicalUrl} target="_blank" rel="noopener noreferrer">
            {host} ↗
          </a>
        </p>
        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.byline}>
          <span className={styles.avatar} aria-hidden="true">
            {initials(post.authorName)}
          </span>
          <span>
            {post.authorName} · {readingMinutes(post.bodyMd)} min read
          </span>
        </p>
      </header>
      <CitedProse className={styles.prose}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeCitedStatements, { cited, className: styles.statement }]]}
          components={components(cited)}
        >
          {body}
        </Markdown>
      </CitedProse>
      <p className={styles.eof}>-- end of {post.slug}.md --</p>
    </article>
  );
}
