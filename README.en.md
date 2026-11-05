# Personal family genealogy

A personal fork of [Gia Phả OS](https://github.com/homielab/giapha-os).

## Run locally

Install Bun and Node.js. Prepare your own workbook at `data/Family_Genealogy.xlsx` using the structure below, then start the app:

```sh
bun install
bun run dev
```

Open http://localhost:3000/dashboard. On first setup, copy `.env.example` to `.env.local` and choose your own `ADMIN_USERNAME` and `ADMIN_PASSWORD` to enable login. Other settings are optional. There are no built-in credentials; without both values the app is read-only for guests.

## Current state

- Guests can browse; log in with the privately configured account to add, edit and delete data in the workbook.
- Members and relationships are stored in `data/Family_Genealogy.xlsx`. The repository contains no Excel data files.
- Edit through the website, or save the workbook in Excel and reload the page. Close Excel before saving from the website.
- Data reads are defined in `lib/data.ts`. Local authentication is implemented in `app/actions/auth.ts` and `lib/auth.ts`.
- Tree components, kinship calculations, lunar dates and JSON/CSV/GEDCOM import/export reuse the original repository's code.
- Uploaded images are stored in `uploads/` alongside the workbook and served through `/uploads/` routes.

## Excel data

Edit `data/Family_Genealogy.xlsx`. The workbook has two required sheets with column names in the first row:

- `persons`: required columns `id`, `full_name`, `gender` (`male`, `female`, `other`). Optional date parts such as `birth_year`, `birth_month`, `birth_day` may be left blank. Other public fields follow `types/index.ts`; boolean fields use `TRUE`/`FALSE` and default to `FALSE`.
- `relationships`: required columns `id`, `type`, `person_a`, `person_b`. For `biological_child`/`adopted_child`, A is the parent and B is the child. Store each `marriage` once.

IDs must be unique UUIDs and stay unchanged when names are edited. Invalid IDs, dates and relationship graphs cause an error rather than being silently skipped. Row timestamps reflect the workbook modification time.

All files under `data/`, including the workbook, its `.bak` backup and images, are ignored by Git. Override `FAMILY_DATA_FILE` in `.env.local` if you prefer another path. Restart after changing this configuration; subsequent workbook edits only require saving and reloading the page. The server reads the workbook outside `public/`; deploy it together with its `uploads/` directory and configure its path there.

Docker Compose mounts the `family-data` volume at `/app/data` and retains it across container replacements. The image contains no workbook; supply your own workbook and images in the volume before use. This volume is separate from the host's `data/` directory. Compose sets `FAMILY_DATA_FILE` to the container path. Running `docker compose down -v` deletes the volume and its data.

The application creates `person_details_private`, `custom_events` and `gallery` sheets as needed. Private details are only returned to admins. Other sheets, custom columns and supported styles are preserved. This is a data workbook; advanced Excel features such as macros are not supported.

Writes use an inter-process lock, validate the current data and detect external edits before atomic replacement. The previous workbook is saved as `.bak`. Saving fails explicitly if Excel has the workbook open or the form is stale. The data directory needs Modify permission. Multiple server processes must share the same workbook and lock directory. Birthdays are derived from member dates. Legacy `.xls` and direct CSV data sources are not supported.

Keep `.env.local`, workbooks, backups and images out of Git and `public/`. Credentials are read only on the server; changing them invalidates old sessions. Configure private environment variables on your deployment server. Back up the workbook together with `uploads/`; JSON/CSV/GEDCOM exports do not include image files.

Run `bun run lint`, `bun run typecheck`, `bun test` and `bun run build` to validate changes. Follow [DESIGN.md](DESIGN.md) for UI work. The original attribution and MIT license are in [LICENSE](LICENSE).
