import type { Metadata } from 'next';
import { Frame } from '@/features/terminal/Frame';
import { Panel } from '@/features/terminal/Panel';
import article from '@/features/terminal/Article.module.css';
import { SITE } from '@/lib/site';
import styles from './page.module.css';

const EMAIL = 'hello@cypher.net';

export const metadata: Metadata = {
  title: 'Contact | Cypher',
  description: 'Get in touch with CYPHER RESEARCH LLC.',
};

const channels = [
  { label: 'Email', value: EMAIL, href: `mailto:${EMAIL}`, external: false },
  { label: 'X', value: '@cypher_asi', href: SITE.status.social.x, external: true },
  { label: 'GitHub', value: 'cypher-asi', href: SITE.status.social.github, external: true },
];

export default function ContactPage() {
  return (
    <Frame className={styles.frame}>
      <Panel title="Contact">
        <article className={article.article}>
          <header className={article.header}>
            <p className={article.meta}>Get in touch</p>
            <h1 className={article.title}>Contact</h1>
            <p className={article.lead}>
              Questions, partnerships, or press? Reach out and we&apos;ll get back to you as soon as we can.
            </p>
          </header>
          <dl className={styles.channels}>
            {channels.map((channel) => (
              <div key={channel.label} className={styles.channel}>
                <dt className={styles.label}>{channel.label}</dt>
                <dd>
                  <a
                    className={styles.link}
                    href={channel.href}
                    {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {channel.value}
                    {channel.external && <span className={styles.external}> ↗</span>}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </article>
      </Panel>
    </Frame>
  );
}
