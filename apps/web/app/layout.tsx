// Root layout. FarmEsy theme + self-hosted Overused Grotesk (Docs/AgriSense_Wireframe.html).
// Theme (light/dark) and language (bn/en) are both stateful — see app/providers.tsx,
// which owns the <Theme mode> wrapping that used to be static here.
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '../theme/farmesy.css';
import './globals.css';
import type { ReactNode } from 'react';
import { AppProviders } from './providers';

export const metadata = {
  title: 'AgriSense AI',
  description: 'Weather-aware, source-cited season planning for smallholder farmers.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
