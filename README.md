# rest-express

## Overview
QEMU / noVNC based virtual OS simulator with a Node.js + Express backend, Vite + React frontend, and Postgres (Drizzle ORM) for persistence.

## Requirements
- Node.js 20
- Postgres 16
- `DATABASE_URL` env var set

## Scripts
- `npm run dev` - start dev server
- `npm run build` - build server + client
- `npm run start` - run production build
- `npm run check` - TypeScript check
- `npm run db:push` - push schema to database

## Environment
- `DATABASE_URL` (required). Render-issued Postgres access token URL, e.g. `postgresql://abc_d...`
- `PORT` (default 5000)
- `VNC_PORT` (default 6000)
- `COLOR` (optional, default `DARK`). UI color mode for client theme. Supported values: `DARK` (current theme) or `WHITE` (gray-based light theme).

## Docker
`Dockerfile` builds a multi-stage image and runs `node dist/index.cjs`.

## Local Setup
1. Install dependencies: `npm ci`
2. Set `DATABASE_URL` (Render Postgres access token URL).
3. Push schema: `npm run db:push`
4. Start dev server: `npm run dev`

## Replit Notes
- HMR: Replit needs WSS + external domain for Vite HMR. This project configures HMR using `REPLIT_DEV_DOMAIN` when available.
- Postgres (Render external URL) requires SSL. The server enables `ssl: { rejectUnauthorized: false }` for `pg` Pool.
- If you see `EADDRINUSE 0.0.0.0:5000`, another dev server is already running. Stop it with `Ctrl+C` and restart.

## Render CLI
```
curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh
```

## Deployment Notes (Prep)
- Target platform is Render. Because Render uses ephemeral filesystems on deploys and restarts, treat `uploads/` as non-persistent.
- Plan: store ISO and snapshot payloads in Postgres (DB as source of truth) and avoid relying on `uploads/` for long-term storage.
- Decision (2026-02-22): proceed with DB upload/storage as the primary path for VM image persistence.
- Current Replit setup is ~90% complete; this repo will be duplicated for Render with storage changes.

## Workflow: Status + Push
- Status updates: Record current progress and decisions in this `README.md` under the `Status` section each time work changes.
- Also record that we are intentionally writing each change here (per user request).
- Push target: Use the GitHub repo below when pushing changes.

```
https://github.com/teto-0401/My-programming-practice
```

## Status
- 2026-02-22: Switched top-page image picker to list local `uploads/` and mount via `/api/vm/set-image`, added `/api/vm/uploads` + `/api/vm/set-image` API routes and client hooks, and removed the unsupported QEMU `isa-fdc.driveA/driveB` globals that caused immediate exits.
- 2026-02-22: Updated QEMU defaults to prefer `-cpu host` when KVM is available, set RAM default to 2048MB in server/client/DB schema, and confirmed boot order uses `-boot d` for ISO and `-boot c` for disk.
- 2026-02-22: Avoided large upload timeouts by disabling HTTP server timeouts and returning upload responses immediately; DB persistence now runs in the background.
- 2026-02-22: Removed upload size limits (multer file size cap and DB size gate). Uploads now attempt DB persistence regardless of size.
- 2026-02-22: `npm run dev` startup confirmed after fixes. Proceeding with DB upload/storage approach as the default persistence path (instead of relying on local `uploads/`).
- 2026-02-22: Added startup DB bootstrap (`CREATE TABLE IF NOT EXISTS` for `vms` and `vm_images`) so app can recover when connected to a fresh DB without running migrations first.
- 2026-02-22: Fixed websocket upgrade conflict by switching VNC proxy `ws` server to `noServer` mode and handling only `/websockify`, avoiding interference with Vite HMR websocket.
- 2026-02-22: Added `COLOR` env-based UI theme switch for `npm run dev` client rendering. `COLOR=DARK` keeps current dark UI; `COLOR=WHITE` applies a gray-based light theme via CSS variables and adjusted VM display header hover colors for readability.
- 2026-02-21: Project context noted. README updated with status/push workflow.
- 2026-02-21: `dev` run showed DB error `relation "vm_images" does not exist` on `/api/vm/images`, and QEMU failed to open ISO at `/app/uploads/TinyCore-16.1.iso` (file missing). API reported success but VM stopped immediately.
- 2026-02-21: Vite HMR websocket failed to connect in Replit-style URL. Repeated DB failures including `relation "vm_images" does not exist` and later `Connection terminated unexpectedly` on `/api/vm` and `/api/vm/images`.
- 2026-02-21: Switched to a new DB after suspend issue. `npm run db:push` fails with `Connection terminated unexpectedly` even with `?sslmode=require` in `DATABASE_URL`.
- 2026-02-21: `drizzle-kit push` completed using create-table selections. App now creates `vms` and `vm_images`, `GET /api/vm` and `GET /api/vm/images` return 200 initially. However, intermittent `Connection terminated unexpectedly` from Postgres causes `/api/vm` 500s, image DB persistence failures, and `POST /api/vm/start` 500. Vite HMR websocket still fails in Replit-style URL. Recording each change in this Status section per user request.
- 2026-02-21: Client polling adjusted to stop refetching `/api/vm` on error (avoid repeated reload on 500) and added verbose client-side API logs across VM hooks for clearer diagnostics.
- 2026-02-21: Observed `Uncaught exception: Error: Connection terminated unexpectedly` from `pg` client; added Postgres pool error handler and enabled keepalive to avoid process crash on idle client errors.
- 2026-02-21: Deployment prep: Render target assumes ephemeral filesystem; long-term plan is DB-only storage for ISO and snapshots (stop relying on `uploads/`). Replit setup is ~90% complete; will duplicate for Render with storage changes.
- 2026-02-21: Adjusted noVNC defaults to reduce cursor misalignment and improve FPS by switching to remote resize, enabling view clip, and tuning quality/compression defaults.
- 2026-02-21: Render deploy shows `getaddrinfo ENOTFOUND dpg-d6ap3goboq4c73dhnrh0-a` for DB host, indicating an invalid or incomplete `DATABASE_URL` on Render (hostname missing full domain).
- 2026-02-21: Render internal DB URL appears truncated to short host (no domain), causing `ENOTFOUND`. If using a DB in a different account, switch to the External URL with `?sslmode=require` despite warnings, then run `npm run db:push` against that DB. If same account/region, attach DB via Render UI so `DATABASE_URL` is injected correctly.
