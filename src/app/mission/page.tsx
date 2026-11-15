import type { Metadata } from 'next';
import { Facts } from '@/components/Facts';
import { Frame } from '@/features/terminal/Frame';
import { Panel } from '@/features/terminal/Panel';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Mission | Cypher',
  description: 'Sovereign AI systems for an autonomous world: what Cypher does, why, and how.',
};

export default function MissionPage() {
  return (
    <Frame className={styles.frame}>
      <Panel title="Mission">
        <Facts />
      </Panel>
    </Frame>
  );
}
