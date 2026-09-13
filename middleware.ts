import { NextResponse, type NextRequest } from "next/server";
import { SECURITY_HEADERS } from "@/lib/security/headers";

/**
 * Attach the shared security baseline to Worker-rendered document responses.
 * Cloudflare Assets `_headers` already covers static files; API routes call
 * `applySecurityHeaders` directly. Vinext does not currently honor
 * `next.config.ts` `headers()` for the HTML shell, so middleware is the
 * remaining in-repo path that can cover `/`.
 */
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  for (const [name, value] of SECURITY_HEADERS) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Apply to document navigations and RSC fetches; skip static assets that
     * already receive `_headers` from Cloudflare Assets.
     */
    "/((?!_next/static|_next/image|favicon\\.svg|data/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
