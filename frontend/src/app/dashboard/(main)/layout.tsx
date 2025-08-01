import { ReactNode } from 'react';

// This layout is for the main dashboard sections
export default function MainDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}