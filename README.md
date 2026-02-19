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
- `MAX_DB_IMAGE_MB` (default 200). Max upload size to persist in DB for reuse.

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
