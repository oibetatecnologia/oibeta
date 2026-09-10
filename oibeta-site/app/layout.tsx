import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'OI BETA Tecnologia',
    template: '%s | OI BETA',
  },
  description:
    'Soluções digitais, GovTech, gestão pública, inteligência eleitoral, processos e dados pela OI BETA Tecnologia.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
