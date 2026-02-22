import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics | Pactwise',
  description: 'View insights and analytics across your contracts and vendors',
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
