import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Field Learning Studio",
  description:
    "AI-assisted evidence synthesis for MEL, evaluation, and professional learning briefs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
