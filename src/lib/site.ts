/**
 * Site configuration for cypher.net: the terminal bar's links, the companies,
 * the status line, metadata and theme defaults.
 */

export type Theme = 'dark' | 'light' | 'system';
export type AccentColor = 'cyan' | 'blue' | 'purple' | 'green' | 'orange' | 'rose' | 'gold';

export interface SiteLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface Company {
  /** Used in `?company=` filters. */
  id: string;
  label: string;
  description: string;
  href: string;
  /** The API site that publishes this company's writing, once it has one. */
  siteId?: string;
}

export interface SiteConfig {
  wordmark: string;
  accent: AccentColor;
  defaultTheme: Theme;
  /** localStorage key for the visitor's theme preference. */
  themeStorageKey: string;
  metadata: {
    title: string;
    description: string;
  };
  /** The main links in the terminal bar. */
  links: SiteLink[];
  companies: Company[];
  status: {
    links: SiteLink[];
    social: { x: string; github: string };
    copyrightName: string;
  };
}

export const GITHUB_ORG = 'https://github.com/cypher-asi';

export const SITE: SiteConfig = {
  wordmark: 'CYPHER',
  accent: 'gold',
  defaultTheme: 'dark',
  themeStorageKey: 'zui-theme-cypher',
  metadata: {
    title: 'Cypher',
    description: 'A sovereign AI stack spanning energy, infrastructure, protocols, and end-products.',
  },
  links: [
    { label: 'Research', href: '/' },
    { label: 'Companies', href: '/companies' },
    { label: 'Papers', href: '/papers' },
    { label: 'Mission', href: '/mission' },
  ],
  companies: [
    { id: 'aura', label: 'AURA', description: 'An agentic coding system', href: 'https://aura.ai' },
    { id: 'zode', label: 'ZODE', description: 'A micro-data center', href: 'https://zode.org', siteId: 'zode' },
    { id: 'wilder-world', label: 'Wilder World', description: 'A virtual simulation', href: 'https://wilderworld.com' },
    { id: 'z-chain', label: 'Z Chain', description: 'A blazing-fast blockchain', href: 'https://zchain.org' },
    { id: 'zero', label: 'ZERO', description: 'A secure messenger', href: 'https://zero.tech' },
  ],
  status: {
    links: [
      { label: 'code', href: GITHUB_ORG, external: true },
      { label: 'news', href: 'https://zine.live', external: true },
      { label: 'sources', href: '/papers/sources' },
      { label: 'contact', href: '/contact' },
      { label: 'privacy', href: '/privacy' },
      { label: 'terms', href: '/terms' },
    ],
    social: { x: 'https://x.com/cypher_asi', github: GITHUB_ORG },
    copyrightName: 'CYPHER RESEARCH LLC',
  },
};

export const companyById = (id: string | null | undefined): Company | null =>
  SITE.companies.find((company) => company.id === id) ?? null;

/** The company whose site published a post, falling back to the site id itself. */
export const companyLabelForSite = (siteId: string): string =>
  SITE.companies.find((company) => company.siteId === siteId)?.label ?? siteId.toUpperCase();
