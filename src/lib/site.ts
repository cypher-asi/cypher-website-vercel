/**
 * Site configuration for cypher.net: the nav, footer, metadata and theme
 * defaults, plus the types the shared chrome components consume.
 */

export type Theme = 'dark' | 'light' | 'system';
export type AccentColor = 'cyan' | 'blue' | 'purple' | 'green' | 'orange' | 'rose';

/* ---------------------------------------------------------------------------
   Navigation (top bar + mega-panel + mobile drawer)
   --------------------------------------------------------------------------- */
export interface NavSubItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  external?: boolean;
  year?: string;
}

export interface NavRepo {
  name: string;
  description: string;
}

export interface NavRepoGroup {
  project: string;
  repos: NavRepo[];
}

export interface NavRepoSection {
  heading: string;
  allHref: string;
  columns: NavRepoGroup[][];
}

export interface NavSection {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  blurb?: string;
  subItems?: NavSubItem[];
  repoSection?: NavRepoSection;
  noPanel?: boolean;
}

/* ---------------------------------------------------------------------------
   Footer
   --------------------------------------------------------------------------- */
export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
  scrollTo?: string;
  year?: string;
}

export interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

export interface FooterSocial {
  x?: string;
  github?: string;
}

export interface FooterCta {
  heading: string;
  button: { label: string; href: string; external?: boolean };
}

export interface FooterConfig {
  columns: FooterColumn[];
  social: FooterSocial;
  copyrightName: string;
  /** Image wordmark shown large at the bottom. */
  wordmarkSrc?: string;
  wordmarkAlt?: string;
  /** Text wordmark fallback when there is no image wordmark. */
  wordmarkText?: string;
  /** Optional pre-footer call-to-action band. */
  cta?: FooterCta;
}

/* ---------------------------------------------------------------------------
   In-page section navigation (the floating scroll-spy nav)
   --------------------------------------------------------------------------- */
export interface PageSection {
  id: string;
  label: string;
}

export interface SiteConfig {
  /** Nav wordmark text. */
  wordmark: string;
  accent: AccentColor;
  defaultTheme: Theme;
  /** localStorage key for the visitor's theme preference. */
  themeStorageKey: string;
  metadata: {
    title: string;
    description: string;
  };
  nav: NavSection[];
  footer: FooterConfig;
  /** Sections for the in-page scroll-spy nav on the landing page. */
  pageSections: PageSection[];
}

const GITHUB_ORG = 'https://github.com/cypher-asi';

const nav: NavSection[] = [
  {
    id: 'products',
    label: 'Companies',
    href: 'https://aura.ai',
    external: true,
    blurb: 'A sovereign AI stack spanning energy, infrastructure, protocols, and end-products.',
    subItems: [
      { id: 'aura', label: 'AURA', description: 'An agentic coding system', href: 'https://aura.ai', external: true },
      { id: 'zode', label: 'ZODE', description: 'A micro-data center', href: 'https://zode.org', external: true },
      { id: 'wilder-world', label: 'Wilder World', description: 'A virtual simulation', href: 'https://wilderworld.com', external: true },
      { id: 'z-chain', label: 'Z Chain', description: 'A blazing-fast blockchain', href: 'https://zchain.org', external: true },
      { id: 'zero', label: 'ZERO', description: 'A secure messenger', href: 'https://zero.tech', external: true },
    ],
  },
  {
    id: 'research',
    label: 'Research',
    href: '/research',
    blurb: 'Open source research to accelerate AI sovereignty for people and communities.',
    subItems: [
      { id: 'the-grid', label: 'THE GRID', description: 'Distributed compute fabric', href: '/research/the-grid', year: '2026' },
      { id: 'aura-harness', label: 'AURA Harness', description: 'A deterministic multi-agent runtime', href: '/research/aura-harness', year: '2025' },
      { id: 'zns', label: 'ZNS', description: 'Naming and trust layer', href: '/research/zns', year: '2022' },
      { id: 'zero-os', label: 'ZERO OS', description: 'A social operating system', href: '/research/zero-os', year: '2020' },
    ],
  },
  {
    id: 'code',
    label: 'Code',
    href: GITHUB_ORG,
    external: true,
    blurb: 'Open source software powering the sovereign AI stack.',
    repoSection: {
      heading: 'Open Source',
      allHref: GITHUB_ORG,
      columns: [
        [
          {
            project: 'AURA',
            repos: [
              { name: 'aura-os', description: 'The Secure OS for AI agents.' },
              { name: 'aura-harness', description: 'A frontier harness for agentic intelligence.' },
              { name: 'aura-router', description: 'Model proxy and billing router for the AURA network.' },
              { name: 'aura-storage', description: 'The execution data layer for the AURA platform.' },
              { name: 'aura-swarm', description: 'An orchestration environment for deploying agent swarms at scale.' },
              { name: 'aura-network', description: 'The social network layer for autonomous agents and teams.' },
              { name: 'aura-bridge', description: 'The AURA bridge to open messaging systems.' },
              { name: 'aura-website', description: 'The official aura.ai website.' },
            ],
          },
        ],
        [
          {
            project: 'ZERO',
            repos: [
              { name: 'zero-os', description: 'A verifiable OS.' },
              { name: 'zos', description: 'A secure and resilient communication system.' },
              { name: 'zero-sdk', description: 'Official SDK for the ZERO messaging protocol.' },
              { name: 'zero-auth', description: 'The auth service for zero-id.' },
              { name: 'zero-vault', description: 'A system for secrets, remote key signing, and access policies.' },
              { name: 'zid', description: 'A post-quantum sovereign identity system.' },
            ],
          },
        ],
        [
          {
            project: 'The Grid',
            repos: [
              { name: 'the-grid', description: 'The Global Resilient Internet Datalink.' },
              { name: 'machina', description: 'A compute orchestration environment for the Machine Age.' },
              { name: 'the-grid-legacy', description: 'An unstoppable distributed compute network.' },
            ],
          },
          {
            project: 'Wilder World',
            repos: [
              { name: 'wilderworld-com', description: 'The official Wilder World site and web platform.' },
              { name: 'wilder-gibson', description: 'A photorealistic world simulation engine.' },
            ],
          },
        ],
        [
          {
            project: 'Cypher Core',
            repos: [
              { name: 'cypher-website', description: 'The official cypher.net website.' },
              { name: 'cypher-asi', description: 'Tools for the Machine Age.' },
              { name: 'z-billing', description: 'The core payments, billing and usage system for the Cypher network.' },
              { name: 'orbit', description: 'A fast git system for machines.' },
              { name: 'spectron', description: 'A code analysis tool for complex code bases.' },
              { name: 'shell', description: 'The standard app shell used to build Cypher ecosystem projects.' },
              { name: 'zui', description: 'A future UI kit made for machines.' },
            ],
          },
        ],
      ],
    },
  },
  {
    id: 'news',
    label: 'News',
    href: 'https://zine.live',
    external: true,
    blurb: 'Dispatches from across the network.',
    noPanel: true,
    subItems: [
      { id: 'zine', label: 'Zine', description: 'Stories from the network', href: 'https://zine.live', external: true },
    ],
  },
];

const footerColumns: FooterColumn[] = [
  {
    heading: 'Companies',
    links: [
      { label: 'AURA', href: 'https://aura.ai', external: true },
      { label: 'ZODE', href: 'https://zode.org', external: true },
      { label: 'Wilder World', href: 'https://wilderworld.com', external: true },
      { label: 'Z Chain', href: 'https://zchain.org', external: true },
      { label: 'ZERO', href: 'https://zero.tech', external: true },
    ],
  },
  {
    heading: 'Research',
    links: [
      { label: 'THE GRID', href: '/research/the-grid', year: '2026' },
      { label: 'AURA Harness', href: '/research/aura-harness', year: '2025' },
      { label: 'ZNS', href: '/research/zns', year: '2022' },
      { label: 'ZERO OS', href: '/research/zero-os', year: '2020' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Mission', href: '/vision', scrollTo: 'what-we-do' },
      { label: 'News', href: 'https://zine.live', external: true },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

export const SITE: SiteConfig = {
  wordmark: 'CYPHER',
  accent: 'cyan',
  defaultTheme: 'dark',
  themeStorageKey: 'zui-theme-cypher',
  metadata: {
    title: 'Cypher',
    description: 'A sovereign AI stack spanning energy, infrastructure, protocols, and end-products.',
  },
  nav,
  footer: {
    columns: footerColumns,
    social: {
      x: 'https://x.com/cypher_asi',
      github: 'https://github.com/cypher-asi',
    },
    copyrightName: 'CYPHER RESEARCH LLC',
    wordmarkSrc: '/images/brand/cypher-wordmark.png',
    wordmarkAlt: '/CYPHER',
  },
  pageSections: [],
};
