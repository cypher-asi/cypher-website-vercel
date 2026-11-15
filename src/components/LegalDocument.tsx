import { Frame } from '@/features/terminal/Frame';
import { Panel } from '@/features/terminal/Panel';
import article from '@/features/terminal/Article.module.css';
import styles from './LegalDocument.module.css';

export interface LegalSection {
  heading: string;
  body: string[];
}

interface LegalDocumentProps {
  eyebrow?: string;
  title: string;
  description: string;
  effectiveDate?: string;
  intro?: string;
  sections: LegalSection[];
  contactHeading?: string;
  contactBody: string;
  email: string;
}

const anchor = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function LegalDocument({
  eyebrow = 'Legal',
  title,
  description,
  effectiveDate,
  intro,
  sections,
  contactHeading = 'Contact us',
  contactBody,
  email,
}: LegalDocumentProps) {
  const headings = [...sections.map((section) => section.heading), contactHeading];
  return (
    <Frame className={styles.frame}>
      <Panel title="Contents" className={styles.contents}>
        <ol className={styles.toc}>
          {headings.map((heading) => (
            <li key={heading}>
              <a className={styles.tocLink} href={`#${anchor(heading)}`}>
                {heading}
              </a>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Read">
        <article className={article.article}>
          <header className={article.header}>
            <p className={article.meta}>
              <span>{eyebrow}</span>
              {effectiveDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{effectiveDate}</span>
                </>
              )}
            </p>
            <h1 className={article.title}>{title}</h1>
            <p className={article.lead}>{description}</p>
          </header>

          <div className={article.prose}>
            {intro && <p>{intro}</p>}
            {sections.map((section) => (
              <section key={section.heading} id={anchor(section.heading)} className={styles.section}>
                <h2>{section.heading}</h2>
                {section.body.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </section>
            ))}
            <section id={anchor(contactHeading)} className={styles.section}>
              <h2>{contactHeading}</h2>
              <p>{contactBody}</p>
              <p>
                <a href={`mailto:${email}`}>{email}</a>
              </p>
            </section>
          </div>
        </article>
      </Panel>
    </Frame>
  );
}
