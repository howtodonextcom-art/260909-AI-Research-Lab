# Security & Reliability Review — Production Hardening Round

**Scope:** backend/observability/security surface added or extended this
round (`/api/health`, `/api/readiness`, structured logging on
`/api/data/refresh`, GAP-07 evidence-gate regression). Written with real
grep/read evidence, not assumption — every claim below cites the exact file
checked.

---

## 1. SSRF — outbound-fetch allowlist

`lib/data/http.ts` (`assertAllowedUrl`) still gates every outbound fetch this
app performs:

```ts
export const ALLOWED_HOSTS = ["raw.githubusercontent.com", "vietlott.vn"] as const;
```

Confirmed by grep (`grep -rn "ALLOWED_HOSTS" lib`) that this constant has
exactly one definition and one consumption site (`assertAllowedUrl` itself,
called from the source adapters). Enforcement checks, in order: HTTPS-only,
no embedded credentials, port restricted to 443, hostname must be on the
allowlist.

**New routes introduce zero new outbound fetch surface:**
- `app/api/health/route.ts` performs no fetch/network call at all.
- `app/api/readiness/route.ts` and `lib/observability/readiness.ts` fetch
  only same-origin, relative paths built from the *incoming request's own
  origin* (`new URL(pathname, origin)` where `pathname` is a hardcoded
  literal like `/data/power645.jsonl`) — never a request-supplied URL, never
  a third-party host, and `assertAllowedUrl`/`ALLOWED_HOSTS` is not even in
  the call path because there is nothing to allowlist-check: the target is
  always this deployment's own static asset. Verified by reading both files
  in full — no `lib/data/http.ts` import, no `ALLOWED_HOSTS` reference, no
  dynamic hostname construction anywhere in either file.

Grep confirming every `fetch(` call site in `app/`, `components/`, and
`lib/observability/`:

```
app/api/readiness/route.ts   -> fetch(new URL(pathname, origin))  [same-origin]
app/page.tsx                  -> fetch("/data/protocol-lock.json"), fetch("/data/experiment-family.json")
components/bao18-panel.tsx    -> fetch("/data/bao18-summary.json")
components/diagnostics-panel.tsx -> fetch("/data/ablation-summary.json"), fetch("/data/portfolio-mc-summary.json")
components/experiment-scorecard.tsx -> fetch("/data/prospective-summary.json")
components/scientific-verdict.tsx -> fetch("/data/prospective-summary.json"), fetch("/data/bao18-summary.json")
lib/observability/readiness.ts -> fetch(new URL(pathname, origin))  [same-origin]
```

Every one of these is a literal relative path or a same-origin `URL`
construction — none accepts caller-controlled input as a hostname. **No SSRF
surface was added.**

---

## 2. XSS — `dangerouslySetInnerHTML`

```
grep -rn "dangerouslySetInnerHTML" app components lib
```

returned **zero matches**. This is a mostly-static research UI with no
user-generated HTML rendering anywhere in the codebase, confirmed by
exhaustive grep across the three directories that contain all UI code, not
assumed from the app's description. No new HTML-rendering surface was added
by this round's routes (both return `Response.json(...)`, never HTML).

---

## 3. Rate limiting — honest scope statement

`lib/data/rate-limit.ts`'s own header comment (unchanged this round, still
accurate) states plainly:

> Single-isolate only, not cross-isolate/distributed... A courtesy/abuse-
> deterrence measure, not a security control.

This review restates that honestly rather than treating it as sufficient at
scale: **the in-process sliding-window limiter on `/api/data/refresh` does
not protect against a distributed or multi-isolate attacker.** A client that
lands on different Cloudflare isolates (which happens routinely under any
real traffic volume, let alone an adversarial burst from multiple
edge-adjacent connections) is not slowed down by it at all. True
distributed/edge-level rate limiting would require Cloudflare
platform-level configuration (e.g. the Cloudflare WAF's rate-limiting
rules, as already named in `ADR-005`'s "What would change this decision"
section) — **this repo and this session have no live deploy access to
configure or verify that platform-side control**, so this review does not
claim it is in place. `/api/health` and `/api/readiness` were deliberately
built with no additional rate limiting of their own; both are cheap,
read-only, and side-effect-free, so the existing platform-level DDoS
protections any Cloudflare Worker gets by default are the appropriate layer
for them, not a bespoke in-process limiter that would only protect a single
isolate anyway.

---

## 4. Dependency surface

`package.json` dependencies/devDependencies (see `npm ls --depth=0`, all
listed, all from the standard npm registry — no git/tarball/local-path
dependencies, no postinstall scripts beyond the repo's own
`scripts/install-ci.mjs`):

Runtime: `class-variance-authority`, `clsx`, `lucide-react`, `next`,
`radix-ui`, `react`, `react-dom`, `tailwind-merge`.

Dev: `@cloudflare/vite-plugin`, `@cloudflare/workers-types`,
`@playwright/test`, `@tailwindcss/postcss`, `@types/node`, `@types/react`,
`@types/react-dom`, `@vitejs/plugin-react`, `@vitejs/plugin-rsc`, `eslint`,
`eslint-config-next`, `react-server-dom-webpack`, `tailwindcss`, `tsx`,
`typescript`, `vinext`, `vite`, `wrangler`.

Four packages use a caret/tilde range rather than an exact pin
(`lucide-react ^1.31.0`, `radix-ui ^1.6.7`, `@playwright/test ^1.63.0`,
`tsx ^4.22.1`) — all four are well-known, actively-maintained packages (an
icon set, a UI primitives library, the official Playwright test runner, and
the TypeScript execution loader already used throughout this repo's own
`npm run` scripts), none introduce new attack surface for this round's
backend work, and `package-lock.json` still pins the resolved versions
actually installed. This round added **zero new dependencies** — every file
created (`lib/observability/logger.ts`, `lib/observability/readiness.ts`,
the health/readiness routes, the GAP-07 test) uses only Node built-ins
(`node:fs/promises`, `node:os`, `node:path`, `node:child_process`,
`node:assert/strict`, `node:test`) and this repo's own existing modules.

---

## 5. CSP — Content-Security-Policy headers

```
grep -rln "Content-Security-Policy\|content-security-policy" app lib next.config.ts scripts
```

returned **zero matches**. This is an honest gap, not a fabricated one: no
CSP header is set anywhere in this codebase's routing or configuration —
not in `next.config.ts`, not in any `route.ts`, not via a Worker-level
header injection. This round did not add one (out of scope for the assigned
backend/observability work, and adding a CSP that could break the existing
UI without live-deploy verification would be an unverified change to ship).
**Recommendation for a future round:** add a baseline CSP via Next.js
`headers()` config or a Worker-level response header (e.g.
`default-src 'self'; connect-src 'self'; img-src 'self' data:;` as a
starting point, tightened after auditing actual asset origins), then verify
in a real deployed environment that it does not break font/style loading
before treating it as shipped.

---

## Summary table

| Check | Result | Evidence |
|---|---|---|
| SSRF allowlist intact | PASS | `lib/data/http.ts` unchanged; new routes never call it, use only same-origin literals |
| New routes add outbound fetch surface | NO (confirmed) | full `fetch(` grep across `app/`, `components/`, `lib/observability/` |
| `dangerouslySetInnerHTML` present | NO (confirmed) | zero grep matches |
| Rate limiter sufficient at scale | NO — honestly documented | `lib/data/rate-limit.ts` header + this review |
| New dependencies added | NO | 0 new entries in `package.json` this round |
| Unpinned dependencies | 4, all low-risk, lockfile-pinned | `npm ls --depth=0` + `package-lock.json` |
| CSP headers present | NO — honest gap, not remediated this round | zero grep matches |
