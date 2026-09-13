import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./lib/security/headers";

const nextConfig: NextConfig = {
  /**
   * Document/HTML responses are served by the Worker (not Cloudflare Assets),
   * so `public/_headers` alone does not cover them. Mirror the same security
   * baseline onto Next route responses; Assets still get `_headers` for
   * static files, and API routes also call `applySecurityHeaders` directly.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS.map(([key, value]) => ({ key, value })),
      },
    ];
  },
};

export default nextConfig;
