import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClubX POS",
  description: "School festival pub POS and handy order app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
