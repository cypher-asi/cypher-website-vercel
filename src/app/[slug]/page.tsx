import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isPostSlug } from '@/features/posts/types';
import { loadPost } from '@/features/terminal/data';
import { Workspace } from '@/features/terminal/Workspace';
import { companyById } from '@/lib/site';

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ company?: string | string[] }>;

/** The post lives on its own company's site; this page points search engines there. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = isPostSlug(slug) ? await loadPost(slug) : null;
  if (!post || post === 'unavailable') return { title: 'Research | Cypher' };
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

/** A published post at cypher.net/{slug}, open in the workspace. */
export default async function PostPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, { company }] = await Promise.all([params, searchParams]);
  if (!isPostSlug(slug) || (await loadPost(slug)) === null) notFound();
  return <Workspace company={companyById(typeof company === 'string' ? company : null)} target={{ slug }} />;
}
