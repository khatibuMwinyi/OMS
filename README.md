# Oweru Management System

Web app for Oweru revenue and expenses management.

## What this app uses

- Next.js 16 App Router
- React 19.2
- Existing Oweru MySQL database schema
- Server actions for authentication and record handling
- `proxy.ts` route protection

## Setup

1. Install Node.js 20.9 or newer.
2. Create the MySQL database used by the existing system, or point the app at the same database with the env vars below.
3. Copy `.env.example` to `.env.local` and update the values.
4. Install dependencies and run the app.

```bash
npm install
npm run dev
```

## Environment

Use the same database as the existing desktop system:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `SESSION_SECRET`

## Database

The consolidated schema for this migration is in [database/schema.sql](database/schema.sql).

## Notes

- The login flow accepts the existing `admin` / `admin123` account and transparently upgrades legacy plaintext passwords to bcrypt hashes.
- Dashboard data is read server-side from the same MySQL tables used by the current project.
- The remaining modules can be ported into route groups under `src/app` without changing the data layer.
