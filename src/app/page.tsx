import { Workspace } from '@/features/terminal/Workspace';
import { companyById } from '@/lib/site';

type SearchParams = Promise<{ company?: string | string[] }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const { company } = await searchParams;
  return <Workspace company={companyById(typeof company === 'string' ? company : null)} />;
}
