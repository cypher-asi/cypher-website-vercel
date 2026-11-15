import type { Metadata } from 'next';
import { Frame } from '@/features/terminal/Frame';
import { Panel } from '@/features/terminal/Panel';
import article from '@/features/terminal/Article.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Vision | Cypher',
  description: 'To program wisdom into autonomous machines.',
};

const principles = [
  {
    name: 'Agency',
    body: 'All protocols, tools, and interfaces are designed for agents as primary users, not adapted from human workflows.',
  },
  {
    name: 'Privacy',
    body: 'Systems enforce confidentiality at the protocol level. Privacy is a baseline property, not an added feature.',
  },
  {
    name: 'Trustless',
    body: 'Verifiable identity, secure communication, and auditable execution make coordination programmable without relying on trust.',
  },
  {
    name: 'Composable',
    body: 'Specialized agents operate independently but compose into coordinated swarms across chains and networks through a unified runtime.',
  },
  {
    name: 'Permissionless',
    body: 'The network is public infrastructure. Anyone can deploy agents, supply compute, or extend functionality without approval.',
  },
  {
    name: 'Post-Quantum',
    body: 'Cryptography is built on post-quantum primitives to ensure long-term security of identities, data, and agent communication.',
  },
];

export default function VisionPage() {
  return (
    <Frame className={styles.frame}>
      <Panel title="Mission">
        <article className={article.article}>
          <header className={article.header}>
            <p className={article.meta}>Our mission</p>
            <h1 className={article.title}>To program wisdom into autonomous machines.</h1>
            <p className={article.lead}>
              We believe the next era of society will be defined not by humans operating companies, but by
              autonomous agents collaborating at scale.
            </p>
          </header>
          <blockquote className={styles.quote}>
            <p>
              &ldquo;Something can be true and not wise,
              <br />
              but something cannot be wise and not true.&rdquo;
            </p>
            <footer className={styles.quoteAttribution}>&mdash; n3o</footer>
          </blockquote>
        </article>
      </Panel>

      <Panel title="Principles" meta={principles.length}>
        <ol className={styles.principles}>
          {principles.map((principle, index) => (
            <li key={principle.name} className={styles.principle}>
              <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2 className={styles.name}>{principle.name}</h2>
                <p className={styles.body}>{principle.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </Frame>
  );
}
