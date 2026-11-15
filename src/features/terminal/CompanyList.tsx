'use client';

import { useState } from 'react';
import Link from 'next/link';
import { productById, type Product } from '@/components/ProductGrid';
import { ProductModal } from '@/components/ProductModal';
import type { Company } from '@/lib/site';
import styles from './Workspace.module.css';

/**
 * Each company opens its product overlay. A company with writing also filters
 * the Research panel to its posts.
 */
export function CompanyList({
  companies,
  counts,
  activeId,
}: {
  companies: Company[];
  counts: Record<string, number>;
  activeId: string | null;
}) {
  const [overlay, setOverlay] = useState<Product | null>(null);

  return (
    <>
      <ul className={styles.rows}>
        <li>
          <Link className={styles.company} href="/" aria-current={activeId === null ? 'page' : undefined} scroll={false}>
            <span className={styles.rowMarker} aria-hidden>
              {activeId === null ? '>' : ' '}
            </span>
            <span className={styles.companyName}>all</span>
          </Link>
        </li>
        {companies.map((company) => {
          const count = company.siteId ? (counts[company.siteId] ?? 0) : 0;
          const active = company.id === activeId;
          const open = () => setOverlay(productById(company.id));
          const body = (
            <>
              <span className={styles.rowMarker} aria-hidden>
                {active ? '>' : ' '}
              </span>
              <span className={styles.companyName}>{company.label}</span>
            </>
          );
          return (
            <li key={company.id}>
              {count > 0 ? (
                <Link
                  className={styles.company}
                  href={`/?company=${company.id}`}
                  aria-current={active ? 'page' : undefined}
                  scroll={false}
                  onClick={open}
                >
                  {body}
                </Link>
              ) : (
                <button className={styles.company} type="button" onClick={open}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {overlay && <ProductModal product={overlay} gridRect={null} onClose={() => setOverlay(null)} />}
    </>
  );
}
