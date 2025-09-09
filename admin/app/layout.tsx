import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pactwise Admin Portal",
  description: "Administrative Dashboard for Pactwise Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
