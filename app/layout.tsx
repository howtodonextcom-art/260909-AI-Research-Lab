import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-mono",
});

const display = Source_Serif_4({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Mega 6/45 Research Lab",
  description: "Thống kê dữ liệu lịch sử và walk-forward backtest các chiến lược Mega 6/45.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body className={`${sans.className} antialiased`}>{children}</body>
    </html>
  );
}
