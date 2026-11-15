import type { ReactNode } from 'react';
import Link from 'next/link';

/** Link back to the site's home page. */
export function BackHomeLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link className={className} href="/">
      {children}
    </Link>
  );
}
