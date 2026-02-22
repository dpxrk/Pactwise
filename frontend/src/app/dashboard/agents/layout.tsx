import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Agents | Pactwise',
  description: 'Monitor and configure AI agents for automated contract analysis',
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
