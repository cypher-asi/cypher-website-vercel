import { Inter, JetBrains_Mono } from 'next/font/google';

/**
 * Central font registry. Each loader exposes a neutral CSS variable
 * (`--font-inter`, `--font-jetbrains`). Semantic tokens (`--font-sans`,
 * `--font-mono`, `--font-display`) live in globals.css.
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

/** Every font variable attached to <html>. */
export const fontVariables = `${inter.variable} ${jetbrainsMono.variable}`;
