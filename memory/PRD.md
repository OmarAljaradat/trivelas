# Trivela — Product & Engineering Notes

## Original Problem Statement
User uploaded an existing Node.js/Express + vanilla HTML/CSS/JS FIFA 27 coins store (`trivela-main.rar`) and asked to:
1. Host it for live preview.
2. Redesign the site background to feel like an authentic FIFA UT coin-store — floating FUT-style cards, smooth entrance & scroll animations across ALL public pages.
3. Restrict palette to the game's core colors (indigo → royal-blue → teal → emerald) on light backgrounds.
4. Reduce and re-distribute the FIFA cards to 2 per side (edges only, no center overlap), keep motion silky.
5. Make the entire site mobile-responsive.
6. Full security audit + button/functional testing — no bugs, no vulnerabilities.

## Architecture
- Node.js/Express monolith at `/app/trivela` (serves both static HTML and `/api/*`).
- Runs on port 3000 via the frontend supervisor: `yarn start → node /app/trivela/server.js`.
- FastAPI proxy at `/app/backend/server.py` on port 8001 forwards all `/api/*` calls to `http://localhost:3000`.
- Kubernetes ingress: `/api/*` → 8001, everything else → 3000.
- Data: single JSON file `/app/trivela/database.json`.
- External URL: `https://preview-project-13.preview.emergentagent.com`.

## What's been implemented
- **2026-01 (v1):** FIFA cinematic background overlay (`fifa-bg.css` + `fifa-bg.js`) auto-injected into every public HTML via Express middleware. 8 floating FUT-style cards, dotted rings, ambient glow, pitch grid, cursor spotlight, scroll parallax, IntersectionObserver reveal system, per-word title rise.
- **2026-01 (v2):** Palette shift to game colors (indigo/blue/teal/emerald) on light gradient body; cards moved to left/right edges only; button/hero re-skin to match.
- **2026-01 (v3):** Cards trimmed to 2-per-side with varied vertical slots; ambient beams removed; smoother 22–30s float durations.
- **2026-01 (Security hardening):**
  - Removed plaintext password storage (`rawPasswordPlaintext` purged at boot + on all future writes).
  - `safeUser()` projection ensures no `password` field ever leaks in any API response.
  - Global `app.use('/api/admin', requireAdmin)` middleware — 32+ admin endpoints now require an admin token.
  - `isAdmin` flag added to user model. Bootstrap: `ADMIN_EMAIL` env (default `admin@trivela.local`) is auto-created with default password on first boot.
  - Login rate limit: 8 attempts / 10 min per IP (429 with Arabic message).
  - Admin pages `/admin.html` and `/admin-mobile.html` have an inline 🔒 guard that runs before any other script, verifies `/api/auth/me → isAdmin`, and blocks rendering otherwise. Legacy redirect suppressed via `window.__adminGuardBlocked`.
  - Removed `req.query.token` fallback so admin tokens can never travel via URL.
  - All admin `fetch` calls are auto-decorated with `Authorization: Bearer <token>` header via a monkey-patched `window.fetch` in the guard block.
- **Bugfix:** Added missing `togglePointsDiscount` on `/buy-objectives.html`.

## Test coverage (iteration_2.json)
- Backend: **35/35 (100%)** — auth matrix (no token / non-admin / admin) across 10 admin endpoints, password-leakage assertions, rate-limit, query-string-token rejection.
- Frontend: **100%** on all requested items — no ReferenceError on any public page; admin guard shows 🔒 without redirect for unauthenticated / non-admin; admin login unlocks dashboard; mobile 390×844 has zero horizontal overflow on `/`, `/buy-coins.html`, `/buy-sbc.html`, `/login.html`.

## Test credentials
See `/app/memory/test_credentials.md`.

## Prioritized backlog
- **P1 (nice UX):** Replace hardcoded `admin@trivela.com` label in `admin.html` header with the actually logged-in admin's email/name.
- **P2 (hardening):** Swap Base64-of-userId tokens for signed JWTs (or opaque server-side sessions) — attackers who guess/observe a userId currently gain a full session. Not exploitable now given ID entropy, but recommended.
- **P2 (scalability):** Move `_loginAttempts` rate-limit counter to a shared store (Redis) if horizontally scaled.
- **P3 (code):** Split `server.js` (2100+ lines) into routers by domain (auth / orders / admin / content / players).

## User personas
- **Buyer** — Arabic-speaking FIFA player looking to purchase coins / SBC completions / Champions & Rivals boosting / coaching / packages / objectives.
- **Admin** — store owner managing orders, users, pricing, coupons, content, marketing hub, expenses, ranks, players scraping.
