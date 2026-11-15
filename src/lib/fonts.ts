import { Albert_Sans, Inter, JetBrains_Mono } from 'next/font/google';

/**
 * Central font registry. Each loader exposes a neutral CSS variable
 * (`--font-inter`, `--font-jetbrains`, `--font-albert`). Semantic tokens
 * (`--font-sans`, `--font-mono`, `--font-display`, `--font-headline`) live
 * in globals.css.
 */
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

/** The ZODE site's headline face, set light for post titles. */
export const albertSans = Albert_Sans({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-albert',
  display: 'swap',
});

/** Every font variable attached to <html>. */
export const fontVariables = `${inter.variable} ${jetbrainsMono.variable} ${albertSans.variable}`;
