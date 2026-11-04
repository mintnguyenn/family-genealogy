# Personal family genealogy

A personal fork of [Gia Phả OS](https://github.com/homielab/giapha-os).

## Run locally

Install Bun and Node.js, then run:

```sh
bun install
bun run dev
```

Open http://localhost:3000/dashboard. Copy `.env.example` to `.env.local` if you need to change the site name or the local admin credentials.

## Current state

- Guests can browse; log in as `admin/admin` to preview editing forms.
- A persistence backend has not been selected. Reads return empty data; saving, importing and uploading report that no database is connected.
- Data reads are defined in `lib/data.ts`. Local authentication is implemented in `app/actions/auth.ts` and `lib/auth.ts`.
- Tree components, kinship calculations, lunar dates and JSON/CSV/GEDCOM processing remain available for the future backend.
- Images use local file paths; file persistence is not implemented yet.

Run `bun run lint`, `bun run typecheck`, `bun test` and `bun run build` to validate changes. Follow [DESIGN.md](DESIGN.md) for UI work. The original attribution and MIT license are in [LICENSE](LICENSE).
