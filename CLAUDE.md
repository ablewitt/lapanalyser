# LapAnalyser — Project Guide

## What this is

Personal/small-team motorsport lap analysis tool. Parses RaceBox VBO telemetry files, detects laps via start/finish gate crossing, and lets riders compare lap data (speed, lean, braking, sectors, speed traps) across sessions and riders.

Target circuit: Morgan Park Raceway, QLD (lat ≈ -28.26°, lng ≈ +152.04°). Also tested against Lakeside and Queensland Raceway.

## Architecture

**Stack:** Vite + React + TypeScript, Recharts (charts), react-leaflet (map), Zustand (state), Vite Web Workers (VBO parsing).

**Key source layout:**
- `src/parsers/vbo/` — VBO file parsing (sections, timestamps, coordinates, lap detection)
- `src/domain/` — pure business logic (lap detection, events, sectors, speed traps, track distance grids)
- `src/store/` — Zustand stores
- `src/components/` — React UI

**VBO parsing quirks:**
- GPS coords are in decimal minutes — divide by 60 for degrees
- RaceBox stores east longitudes as negative — negate after conversion: `lng = -(raw/60)`
- Timestamps are HHMMSS.SS with midnight rollover detection in `timestamp.ts`
- Lap detection via 2D line-segment intersection against the `[laptiming]` gate
- New parsers go in `src/parsers/registry.ts`

**Vite 8 / Rolldown rule:** All TypeScript interfaces imported across module boundaries must use `import type`. Plain `import` for types causes a MISSING_EXPORT error (white page on load).

## Multi-user migration — decision & requirements

### Platform decision: Supabase + Vercel

**Decision date:** 2026-07-04  
**Rationale:** The sharing/permissions model (private → shared with user → public) maps cleanly to PostgreSQL Row-Level Security. Supabase bundles auth + Postgres + object storage in one service with a strong TypeScript SDK. Free tier covers the target scale (<100 MAU) indefinitely. Vercel hosts the Vite SPA.

Alternatives considered: Cloudflare (no built-in auth), Firebase (NoSQL wrong for relational queries), Vercel+Neon+Clerk+R2 (better DX but four vendors).

### User-facing requirements

**Auth**
- Sign up and log in (email/password minimum)

**Session files**
- Upload VBO session files
- Save / load session files
- Rename session files
- Search own session files (by filename, venue, date)
- Override / save track selection per session (in case auto-detection picks the wrong track)

**Track configurations** (sectors + speed traps per track)
- Save track configs per track (name, sectors, traps)
- Multiple configs per track, with a default selection
- Share a track config with specific users or make it public
- Search publicly available track configs

**Sessions sharing**
- Share a session with specific users or make it public
- Search publicly available sessions

**User settings** (persisted per user)
- Map base layer
- Heat map on/off
- Show/hide: sectors, events, speed traps

### Planned schema (Supabase / PostgreSQL)

```
users              — managed by Supabase Auth (auth.users)
sessions           — id, user_id, filename, venue_id, date_recorded, is_public, storage_path
tracks             — id, name, venue_string (detected from VBO comments section)
track_configs      — id, user_id, track_id, name, is_default, is_public, sectors JSONB, traps JSONB
track_config_shares — config_id, shared_with_user_id
session_shares     — session_id, shared_with_user_id
user_settings      — user_id PK, map_base, show_heatmap, show_sectors, show_events, show_traps
```

RLS policies enforce visibility: owner OR explicitly shared OR is_public.
