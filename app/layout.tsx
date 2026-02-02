import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anna Kosar – Psychologische Beratung",
  description: "Basis für die Webseite annakosar.com",
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
