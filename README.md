# LapAnalyser

Motorsport lap analysis for track riders and small teams. Upload [RaceBox](https://www.racebox.pro/) VBO telemetry, and LapAnalyser detects laps by start/finish gate crossing and lets you compare data across sessions and riders — speed, lean, braking, sector splits, and speed traps — over a map and synchronised charts.

Primarily tested against Morgan Park Raceway (QLD), Lakeside, and Queensland Raceway, with a bundled index of 400+ circuits worldwide.

Live at **[lapanalyser.com](https://lapanalyser.com)**.

## Stack

| Layer | Choice |
| --- | --- |
| Build / dev | [Vite 8](https://vite.dev/) (Rolldown) + `@vitejs/plugin-react` |
| UI | [React 19](https://react.dev/) + TypeScript |
| Routing | React Router 7 |
| State | [Zustand](https://zustand.docs.pmnd.rs/) |
| Charts | [Recharts](https://recharts.org/) |
| Map | [React Leaflet](https://react-leaflet.js.org/) + Leaflet |
| VBO parsing | Vite Web Workers (off the main thread) |
| Backend | [Supabase](https://supabase.com/) — Postgres 17, Auth, Storage, Row-Level Security |
| Hosting | [Vercel](https://vercel.com/) (SPA) |
| Test / lint | [Vitest](https://vitest.dev/) + [Oxlint](https://oxc.rs/) |

Supabase is backend-only (database, auth, file storage); the built SPA is served by Vercel.

### Source layout

- `src/parsers/vbo/` — VBO file parsing (sections, timestamps, coordinates, lap detection). Register new parsers in `src/parsers/registry.ts`.
- `src/domain/` — pure business logic: lap detection, events, sectors, speed traps, track distance grids.
- `src/store/` — Zustand stores (sessions, selection, auth).
- `src/lib/` — Supabase client and data services (sessions, sharing, track configs, user settings).
- `src/components/` — React UI.
- `supabase/` — schema migrations and CLI config.

## Prerequisites

- Node.js 20+ and npm
- A Supabase project (for auth/storage/database)
- [Supabase CLI](https://supabase.com/docs/guides/cli) — used via `npx supabase`, no global install needed

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#   then fill in the two values from Supabase dashboard > Project Settings > API:
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
#   (the anon key is public by design — it ships in the browser bundle and is guarded by RLS)

# 3. Start the dev server (http://localhost:5173)
npm run dev
```

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with Oxlint |

## Supabase (database & config)

The remote project is the source of truth for data; the local `supabase/` folder is the source of truth for **schema and config**.

```bash
# See which migrations are applied locally vs. remote
npx supabase migration list

# Apply new schema migrations to the remote database
npx supabase db push

# Push config.toml (auth URLs, storage settings, etc.) to the remote project
npx supabase config push
```

Notes:
- Auth settings (Site URL, redirect URLs, email confirmations) live in `supabase/config.toml` and only take effect remotely after `config push`.
- `[storage.vector] enabled` must stay `false` on the free tier — Vector Buckets are Pro-only and a `true` value makes `config push` fail with HTTP 402.
- RLS enforces visibility everywhere: a row is readable if you own it, it was shared with you, or it is public.

## Pushing to production

Production deploys are **Git-driven** — Vercel is connected to this repo and auto-deploys.

```bash
git push origin master    # every push to master → production deploy
```

Pull requests get their own preview URL automatically.

Setup that's already in place (for reference):
- **Env vars** — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel (Project Settings > Environment Variables) across all environments. They must match your Supabase project.
- **Routing** — `vercel.json` rewrites all paths to `/index.html` for client-side routing.
- **Domain** — the apex `lapanalyser.com` is canonical; `www` redirects to it (handled by Vercel's domain config). Apex must stay primary because it matches the Supabase auth Site URL — flipping to `www` would break auth redirects.

If you change the schema, run `npx supabase db push` **before** the code that depends on it reaches production.

## Gotchas

- **Vite 8 / Rolldown:** every TypeScript interface imported across module boundaries must use `import type`. A plain `import` for a type throws a `MISSING_EXPORT` error (blank white page on load).
- **VBO quirks:** GPS coords are decimal minutes (divide by 60 for degrees); RaceBox stores east longitudes as negative, so negate after converting (`lng = -(raw / 60)`); timestamps are `HHMMSS.SS` with midnight rollover handling.
