import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Field Learning Studio",
  description:
    "AI-assisted evidence synthesis for MEL, evaluation, and professional learning briefs.",
};

const themeScript = `(function() {
  try {
    var stored = localStorage.getItem('fls_theme');
    var theme = stored;
    if (!theme || (theme !== 'day' && theme !== 'night')) {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'night');
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="night" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
