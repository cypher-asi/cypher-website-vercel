import { ProductGrid } from '@/components/ProductGrid';
import { Frame } from '@/features/terminal/Frame';
import { Panel } from '@/features/terminal/Panel';
import styles from './Landing.module.css';

export default function CypherLanding() {
  return (
    <Frame className={styles.frame}>
      <Panel title="Companies" bodyClassName={styles.gridBody}>
        <div className={styles.gridFrame}>
          <ProductGrid />
        </div>
      </Panel>
    </Frame>
  );
}
