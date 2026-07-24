// Root layout. FarmEsy theme + self-hosted Overused Grotesk (Docs/AgriSense_Wireframe.html).
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '../theme/farmesy.css';
import './globals.css';
import type { ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
// farmesyTheme is our own defineTheme() output (theme/farmesy.js, built by
// `astryx theme build`) — a plain data object with no client-only side effects,
// unlike @astryxdesign/theme-neutral's runtime export. Safe to import directly.
import { farmesyTheme } from '../theme/farmesy';

export const metadata = {
  title: 'AgriSense AI',
  description: 'Weather-aware, source-cited season planning for smallholder farmers.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Theme theme={farmesyTheme}>
          <div className="app-canvas">{children}</div>
        </Theme>
      </body>
    </html>
  );
}
