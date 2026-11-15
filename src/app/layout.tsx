import type { Metadata, Viewport } from 'next';
import './styles/globals.css';
import { Footer } from '@/components/Footer';
import { ThemeWrapper } from '@/components/ThemeWrapper';
import { MusicProvider } from '@/components/MusicContext';
import { CustomScrollbar } from '@/components/CustomScrollbar';
import { TerminalBar } from '@/features/terminal/TerminalBar';
import { fontVariables } from '@/lib/fonts';
import { SITE } from '@/lib/site';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: SITE.metadata.title,
  description: SITE.metadata.description,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables} data-accent={SITE.accent}>
      <body>
        <Providers>
          <ThemeWrapper
            defaultTheme={SITE.defaultTheme}
            defaultAccent={SITE.accent}
            storageKey={SITE.themeStorageKey}
          >
            <MusicProvider>
              <CustomScrollbar />
              <TerminalBar wordmark={SITE.wordmark} links={SITE.links} />
              <main id="page-main">{children}</main>
              <Footer status={SITE.status} />
            </MusicProvider>
          </ThemeWrapper>
        </Providers>
      </body>
    </html>
  );
}
