# Mount Olive SMS — Performance Plan

Goal: make every page feel instant for every role, on Ethiopian internet, without changing how the app works.

---

## 0. Measured diagnosis (baseline)

**Backend is NOT the problem.**
| Check | Result |
|---|---|
| API latency on origin (localhost) | `/auth/me` 8ms, students 20ms, fees/summary 16ms, reports 7–12ms |
| DB | Indexed (users, students, attendance, payments, timetable); 3.4k students |
| Server | 6 cores / 11 GB RAM, Node 20, healthy |

**The problem is delivery + client behaviour.**
| Check | Result | Impact |
|---|---|---|
| Origin TTFB from client | ~600 ms | Every request starts with a long wait |
| Server location | OVH Canada → no CDN | Full RTT on every asset + API call |
| Entry JS `index.js` | **379.6 KB uncompressed** | 15.8 s on this link uncompressed |
| Same asset gzipped | 119 KB / 2.5 s | Still slow; **Brotli is OFF** (test returned uncompressed) |
| Initial load JS | index 379.6 + i18n 77.6 + api 43.9 + react 0.6 = **~502 KB** | ~150 KB gz, 4–5 round-trips |
| CSS | 48.5 KB (uncompressed) | additional |
| Google Fonts | 2 external origins (googleapis + gstatic) | +2 full RTTs before text renders |
| React Query config | `retry:1`, `refetchOnWindowFocus:false` — **`staleTime` = 0** | **Every navigation refetches everything and shows a spinner** |
| Cache persistence | none (in-memory only) | Reload = everything cold again |
| Route chunks | lazy ✅ but **no prefetch** | Click → download chunk → then fetch data |
| Full-page fallback | root `<Suspense fallback="Loading...">` | Whole screen flashes on every route change |
| Dashboard data calls | ~12 parallel API calls per visit | 12 RTTs on a 600 ms link = ~1.5–2 s |
| Reports page | ~12 calls | same |
| Polling | `useNotifications` + chat unread every 30 s | constant background traffic |
| `dist/assets` | **21 MB, 14 stale `index-*.js` copies** | bloat + slow deploys |
| nginx | gzip on (global), HTTP/2 on, `/assets` 30d immutable ✅, **brotli not active** | misses ~30% size + on-the-fly cost |
| API headers | has `ETag`, **no `Cache-Control`** | no browser reuse of safe GETs |
| pm2 | single **fork**, 6 cores idle | no concurrency headroom |

**One-line summary:** requests travel ~600 ms each to Canada and nothing is cached, so the app re-fetches and re-downloads on every click. The fix is edge caching + compression + a client cache that makes clicks instant.

---

## 1. Targets
- TTFB (static asset, cached): **< 60 ms** (edge)
- LCP on first load: **< 1.8 s** (was 5–15 s)
- Route switch (cached data): **< 150 ms**
- Initial JS transferred: **< 120 KB gzip** (from ~150 KB, and no re-download after first visit)
- Repeat visit: **near-instant** (assets + data from cache, revalidate in background)

---

## 2. Layer 1 — Edge / CDN (biggest single win)
Put **Cloudflare** (free tier is enough) in front of `mountoliveschool.net`.
- Static assets served from the **Addis Ababa edge PoP** → RTT drops from ~600 ms to ~10–30 ms.
- Automatic **Brotli + HTTP/3 + Early Hints + TLS 1.3**.
- Cache rules:
  - `/assets/*` → Cache Everything, Edge TTL 1 year (they’re content-hashed).
  - `/`, `/index.html`, `/manifest.json`, `/favicon.svg` → short TTL, must-revalidate.
  - `/api/*` and `/socket.io/*` → **bypass cache** (dynamic + auth), WebSockets on.
- Keep origin behind firewall/only Cloudflare IPs.
- Verifies: `cf-cache-status: HIT` on assets.

> Even without CDN, Layers 3–6 below remove most user-perceived delay.

---

## 3. Layer 2 — Transfer (compression + caching + nginx)
- **Enable Brotli** (install `nginx` brotli module) or, safer, **pre-compress at build** (`vite-plugin-compression` → `.br`/`.gz`) and serve via `brotli_static on; gzip_static on;` in the `mountoliveschool.net` block. → ~30% smaller than gzip, zero CPU per request.
- **Self-host the font** (subset Plus Jakarta Sans WOFF2, `font-display: swap`, `<link rel="preload">`) or fall back to a system stack. Removes 2 external RTTs per load.
- Add `keepalive` upstream for `/api` + `proxy_http_version 1.1` (already), `open_file_cache` for static.
- Add `Cache-Control: private, max-age=30..300` (app-level) on safe GETs so the browser reuses within a session; keep `ETag` for 304s.
- Housekeeping: deploy to a **versioned release dir + atomic symlink** and set `emptyOutDir: true`, pruning old releases. Kills the 21 MB/14-duplicate bloat.

---

## 4. Layer 3 — Bundle / initial load
- **`manualChunks`** in `vite.config.js`: split `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `radix-ui`, `lucide-react`, `axios`. Vendor chunks cache forever; page chunks stay tiny.
- Run **`rollup-plugin-visualizer`** once; remove dead weight (lint already shows many unused imports; `lucide-react` pulls a lot).
- **i18n off the critical path**: split `phrases.js` by language and `import()` the active language *after* first paint; ship English inline, load Amharic on demand. (Currently 77 KB modulepreloaded on every load.)
- **Preload the route chunk** for the logged-in role after auth (see §10).
- Keep `modulepreload` for the entry only; add `<link rel="preload">` for the entry CSS.
- Confirm tree-shaking of `lucide-react` (import icons individually) and that no whole-library import remains.

---

## 5. Layer 4 — Client data layer (this is what makes *clicks* instant)
1. **React Query defaults** in `App.jsx`:
   - `staleTime: 30_000` base, `gcTime: 30 * 60_000`, `refetchOnMount: false`, `refetchOnReconnect: false`, `retry: 1`.
   - `placeholderData: keepPreviousData` for all list/search pages.
2. **Per-resource staleTime** (stop re-fetching things that never change):
   - Long (30–60 min): `subjects`, `classes`, `roles/permissions`, `settings`, `salary grades`, `fee structures`, teacher assignments.
   - Medium (5 min): teacher/student/parent lists, reports.
   - Short (15–30 s): dashboard KPIs, notifications, payments.
3. **Persist the cache** to IndexedDB (`@tanstack/query-persist-client-core` + `idb-keyval`), versioned, **cleared on logout / user or tenant change**. On reload the app paints from cache instantly, then revalidates. Biggest perceived-speed win on a high-latency link.
4. **Prefetch**:
   - On sidebar **hover/focus** → prefetch the target route’s JS chunk (`import(...)`) **and** its primary queries.
   - After login and on `requestIdleCallback` → warm the role’s top 3 pages.
   - `queryClient.prefetchQuery` with the exact same query keys as the page (audit keys so prefetch actually hits).
5. **Seed after mutations** instead of invalidating everything (already partly done) — avoids refetch storms.
6. **Deduplicate keys**: audit hooks that build keys with different param objects (e.g. `{}` vs `undefined`) so caching/keying is consistent.

---

## 6. Layer 5 — Perceived speed (UI)
- **Move `<Suspense>` inside `AppLayout`** so the sidebar/header never unmount; only the content area shows a **skeleton** shaped like the page (cards/table rows), not a blank “Loading…”.
- Per-page skeleton components (Dashboard, Students, Reports, Fees, Payroll, Tables).
- Show **cached data immediately**, skeleton only on true first load.
- Add a thin **top progress bar** on route change.
- Keep list row/pagination transitions with `keepPreviousData` (no white flash).

---

## 7. Layer 6 — Backend
- **pm2 cluster mode** (`pm2 start -i max`) to use all 6 cores → more concurrency, steady latency under load.
- **In-memory cache (node-cache) or Redis** for near-static data, invalidated on write:
  `settings`, `subjects`, `classes`, `roles/permissions`, `salary grades`, `fee structures`, teacher assignments, homeroom map, announcement read models.
- **Combined endpoints to kill the waterfalls**:
  - `GET /dashboard` (role-aware) → one call returns all cards/charts (replaces ~12).
  - `GET /reports/summary?type=…` → one call per Reports tab instead of many.
  - `GET /students/:id/overview` → profile + enrollments + fees + attendance in one (StudentDetail).
- Add **`Cache-Control` + 304/ETag** support on safe GETs; consider a short **stale-while-revalidate** app cache for lists.
- **Avoid `SELECT *` / N+1** in list endpoints; select only needed columns.
- Add **`pg_trgm` GIN indexes** for student/parent name search (`ILIKE %x%`) before data grows.
- Cap oversized `limit=200` reference-list calls (serve from cache instead).
- Tune the pg pool and add `statement_timeout` guardrails.

---

## 8. Layer 7 — Realtime / polling
- Replace `useNotifications` 30 s polling and chat unread 30 s polling with **socket push** (socket infra already exists for chat).
- Ensure sockets are **visibility-aware** (`refetchIntervalInBackground: false`; pause when tab hidden).
- One shared notifications store instead of per-component queries.

---

## 9. Page-by-page plan

Legend: **ST** = staleTime, **PF** = prefetch, **Sk** = skeleton, **Comb** = combine endpoints.

| Page | Main data calls | Planned changes |
|---|---|---|
| **Login** | `dev-users` + `login` + `me` | prefetch dashboard chunk on mount; after login seed dashboard cache before navigate; splash from persisted auth; CDN-cached assets |
| **Dashboard (all roles)** | ~12 (students, classes, subjects, teachers, payment summary, expense totals, announcements, enrollment, headcount, payroll sum, revenue, workload) | **ONE `/dashboard` endpoint**, ST 60 s, PF on login hover, Sk, cache persist |
| **Students** | list (paged/search) | ST 60 s, keepPreviousData, debounced search, prefetch on hover, Sk rows |
| **Student Detail** | profile + enrollments + fees + attendance + docs | **`/students/:id/overview`**, ST 5 min |
| **Parents** | list + links | ST 5 min, PF |
| **Teachers / Users** | list + assignments | ST 10 min, cache, PF |
| **Classes / Subjects** | list (limit 200) | ST 30 min, cached server-side, PF, remove 200-limit refetch |
| **Attendance** | overview + class list + stats | ST 30 s; mark mutation seeds cache (no full refetch); Sk |
| **Class Attendance Stats** | stats + roster | ST 30 s, PF |
| **Exams** | list | ST 5 min, PF |
| **Grades** | per-exam | ST 60 s, optimistic save |
| **Timetable** | entries per class (+ teacher/parent scoping) | ST 10 min, PF, Sk grid; already optimized slots |
| **Fees / Payments / Student-Fees / Monthly-Collection** | structures, summary, payments, subscriptions, bills | ST 5 min ref data / 30 s money data; combined summaries; keepPreviousData; seed after payment |
| **Collection Report** | collection-report | ST 60 s, PF |
| **Expenses** | list + totals | **one call** (list+totals), ST 60 s |
| **Payroll / Salary Register / Payroll Audit** | payroll list, summary, grades, audits, leaves | combined summary; ST 5 min; PF |
| **Leave / Tax / Homeroom** | lists + settings | ST 30 min, cache |
| **Reports** | ~12 (enrollment, headcount, workload, staff dir, payroll, attendance, my-*) | **`/reports/summary`** per tab, lazy-mount tabs (only active tab queries), ST 5 min, PF |
| **Announcements** | list/my | ST 60 s, PF |
| **Chat** | conversations, messages, contacts, unread (30 s poll), reports | socket push for unread, paginate messages, ST 10 s, remove poll |
| **Quality Assurance / Teacher Workspace** | submissions, summary, bank | ST 60 s, lazy tabs |
| **Discipline** | cases | ST 60 s |
| **Shift Hub / Teacher Attendance / KPIs** | shifts, staff-attendance, kpis | ST 5 min, combined stats |
| **Assets / Operations / General Services** | lists + summaries | ST 10 min, combined |
| **Accountant Reconciliation** | collections + batches | ST 30 s, one call |
| **Security Hub** | visitors, gate passes, incidents | ST 30 s |
| **Executive Dashboard** | kpis + trend | ST 60 s, one call |
| **Audit Logs** | paged list | keepPreviousData, ST 60 s |
| **Roles/Permissions** | roles + permissions | ST 30 min, cache |
| **Settings / Backup / Import / Enrollment Wizard** | config, uploads | ST 30 min; uploads unaffected |

---

## 10. Role-by-role warm-up (after login)

| Role | Prefetch (chunk + queries) |
|---|---|
| owner / admin | Dashboard, Students, Fee Structures, Monthly Collection, Reports |
| general_manager | Executive Dashboard, Payroll, Reports, Students |
| principal / vice_principal / quality_director | Dashboard, Quality Assurance, Students, Attendance, Reports |
| hr | Dashboard, Teacher Attendance, Payroll, Users, Leave |
| finance | Dashboard, Fee Structures, Payments, Collection Report, Payroll |
| cashier | Dashboard, Enrollment Wizard, Students, Monthly Collection |
| accountant | Dashboard, Accountant Portal, Fees, Payroll |
| teacher | Dashboard, Timetable, Attendance, Teacher Workspace |
| student | Dashboard, Timetable, Announcements |
| parent | Dashboard, Timetable, Announcements, Chat |
| support | Dashboard, Announcements, Chat |
| shift_coordinator | Shift Hub, Timetable, Teacher Attendance |
| security_head | Security Hub, Reports |

Implement via `ROLE_PREFETCH[role]` → `import()` chunk + `prefetchQuery` on idle.

---

## 11. Verification & monitoring
- **Web Vitals RUM** (`web-vitals` → backend endpoint) to see real TTFB/LCP/INP per route/role.
- **Lighthouse** budgets in CI + **WebPageTest** from an Addis Ababa node for real-link numbers.
- Baseline vs after: TTFB, LCP, route-switch time, transferred KB, request count.
- Add a `perf` query param/log to measure time-to-data per page.

---

## 12. Phased rollout (highest impact first)

**Phase 1 — Delivery (day 1):** Cloudflare + Brotli/precompressed + self-hosted font. Expected: initial load 15 s → ~1.5 s; TTFB 600 ms → <60 ms.

**Phase 2 — Client cache (days 2–3):** React Query defaults + staleTime + IndexedDB persistence + skeletons + layout-persistent Suspense. Expected: every page click instant on repeat; no spinner flash.

**Phase 3 — Prefetch + bundle split (days 4–5):** hover/idle prefetch, role warm-up, manualChunks, i18n lazy. Expected: first click per page fast; smaller initial JS.

**Phase 4 — Backend (week 2):** pm2 cluster, in-memory cache, combined `/dashboard` + `/reports/summary` endpoints, socket pushes replacing polling. Expected: fewer requests per page (12 → 1–3), less load.

**Phase 5 — Hardening:** ETag/304, `pg_trgm` search indexes, monitoring, budgets. Keeps it fast as data grows.

---

## Guardrails / risks
- **Cache invalidation correctness**: every write must invalidate the right keys (and the persisted cache must be versioned + cleared on logout/user switch) so users never see stale money/attendance.
- **Auth**: keep the httpOnly cookie (do not move tokens to localStorage); persisted query cache must be scoped per user and wiped on logout.
- **CDN + WebSockets**: ensure `/socket.io/*` bypass and WebSockets enabled, or chat breaks.
- **Don’t cache `/api` at the edge** for authenticated data.
