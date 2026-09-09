import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mega 6/45 Research Lab",
  description: "Thống kê dữ liệu lịch sử và walk-forward backtest các chiến lược Mega 6/45.",
  other: {
    "codex-preview": "development",
  },
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
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
