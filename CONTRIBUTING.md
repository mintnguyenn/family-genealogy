# Development

This is a personal fork. Keep changes focused and preserve the upstream UI and pure genealogy algorithms where practical.

- Run locally with `bun install` and `bun run dev`.
- Follow `DESIGN.md` for UI changes.
- Data access belongs in `lib/data.ts` and domain helpers, rather than in visual components.
- Keep the Vietnamese and English dictionaries in sync.
- Validate with lint, type checking, relevant tests and a production build.
- Use fictional family data in issues and tests; keep `.env.local` out of version control.
