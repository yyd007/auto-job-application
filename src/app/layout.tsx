import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Application plan",
  description: "Read a job URL, propose answers from a local profile, and do not submit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
