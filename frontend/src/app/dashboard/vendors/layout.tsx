import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vendors | Pactwise',
  description: 'Manage and analyze your vendor relationships',
};

export default function VendorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
