'use client';

import { useState } from 'react';
import { productById, type Product } from '@/components/ProductGrid';
import { ProductModal } from '@/components/ProductModal';
import type { Company } from '@/lib/site';
import styles from './Workspace.module.css';

/** Each company opens its product overlay. */
export function CompanyList({ companies }: { companies: Company[] }) {
  const [overlay, setOverlay] = useState<Product | null>(null);

  return (
    <>
      <ul className={styles.rows}>
        {companies.map((company) => (
          <li key={company.id}>
            <button className={styles.company} type="button" onClick={() => setOverlay(productById(company.id))}>
              <span className={styles.companyName}>{company.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {overlay && <ProductModal product={overlay} gridRect={null} onClose={() => setOverlay(null)} />}
    </>
  );
}
