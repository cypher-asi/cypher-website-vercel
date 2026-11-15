'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { pageview, setAnalyticsProvider } from '@/features/analytics';
import { createMixpanelProvider } from '@/features/analytics/mixpanel';

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Point the analytics boundary at Mixpanel. No-op if no token is configured.
  useEffect(() => {
    const provider = createMixpanelProvider();
    if (provider) setAnalyticsProvider(provider);
  }, []);

  // Fire a pageview on first load and on each client-side navigation.
  useEffect(() => {
    if (pathname) pageview(pathname);
  }, [pathname]);

  return <>{children}</>;
}
