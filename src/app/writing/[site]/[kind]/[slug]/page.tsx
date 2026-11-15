import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadPost } from '@/features/terminal/data';
import { Workspace } from '@/features/terminal/Workspace';
import { companyById } from '@/lib/site';

type Params = Promise<{ site: string; kind: string; slug: string }>;
type SearchParams = Promise<{ company?: string | string[] }>;

/** The post lives on its own company's site; this page points search engines there. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { site, kind, slug } = await params;
  const post = await loadPost(site, kind, slug);
  if (!post || post === 'unavailable') return { title: 'Writing | Cypher' };
  return {
    title: `${post.title} | Cypher`,
    description: post.summary || undefined,
    alternates: { canonical: post.canonicalUrl },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.summary || undefined,
      publishedTime: post.publishedAt,
      authors: [post.authorName],
      url: post.canonicalUrl,
    },
  };
}

export default async function WritingPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ site, kind, slug }, { company }] = await Promise.all([params, searchParams]);
  if ((await loadPost(site, kind, slug)) === null) notFound();
  return (
    <Workspace company={companyById(typeof company === 'string' ? company : null)} target={{ site, kind, slug }} />
  );
}
