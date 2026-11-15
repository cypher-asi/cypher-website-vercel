import type { Metadata } from 'next';
import CypherLanding from '@/sites/cypher/Landing';

export const metadata: Metadata = {
  title: 'Companies | Cypher',
  description: 'The companies building the sovereign AI stack: AURA, ZODE, Wilder World, Z Chain and ZERO.',
};

export default function Companies() {
  return <CypherLanding />;
}
