// Root layout (§C.3). Bengali-first UI (lang="bn", §B.5).
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'AgriSense AI',
  description: 'Weather-aware, source-cited season planning for smallholder farmers.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
