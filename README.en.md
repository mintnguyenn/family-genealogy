# Personal family genealogy

A personal fork of [Gia Phả OS](https://github.com/homielab/giapha-os).

## Run locally

Install Bun and Node.js. On the first run, copy the example workbook:

```sh
bun install
cp data/Family_Genealogy.example.xlsx data/Family_Genealogy.xlsx
bun run dev
```

Open http://localhost:3000/dashboard. Copy `.env.example` to `.env.local` if you need to change the site name or the local admin credentials.

## Current state

- Guests can browse; log in as `admin/admin` to add, edit and delete data in the workbook.
- Members and relationships are stored in `data/Family_Genealogy.xlsx`. A separate example workbook contains fictional parents and two children.
- Edit through the website, or save the workbook in Excel and reload the page. Close Excel before saving from the website.
- Data reads are defined in `lib/data.ts`. Local authentication is implemented in `app/actions/auth.ts` and `lib/auth.ts`.
- Tree components, kinship calculations, lunar dates and JSON/CSV/GEDCOM processing remain available for the future backend.
- Uploaded images are stored in `uploads/` alongside the workbook and served through `/uploads/` routes.

## Excel data

Edit `data/Family_Genealogy.xlsx`. The workbook has two required sheets with column names in the first row:

- `persons`: required columns `id`, `full_name`, `gender` (`male`, `female`, `other`). Optional date parts such as `birth_year`, `birth_month`, `birth_day` may be left blank. Other public fields follow `types/index.ts`; boolean fields use `TRUE`/`FALSE` and default to `FALSE`.
- `relationships`: required columns `id`, `type`, `person_a`, `person_b`. For `biological_child`/`adopted_child`, A is the parent and B is the child. Store each `marriage` once. The example has one marriage and four parent-child links.

IDs must be unique UUIDs and stay unchanged when names are edited. Invalid IDs, dates and relationship graphs cause an error rather than being silently skipped. Row timestamps reflect the workbook modification time.

The working workbook, its `.bak` backup and images under `data/` are ignored by Git; only `Family_Genealogy.example.xlsx` is tracked. Do not copy the example over an existing workbook. Override `FAMILY_DATA_FILE` in `.env.local` if you prefer another path. Restart after changing this configuration; subsequent workbook edits only require saving and reloading the page. The server reads the workbook outside `public/`; deploy it together with its `uploads/` directory and configure its path there. Docker starts with example data; mount a volume at `/app/data` to retain data across container replacements.

The application creates `person_details_private`, `custom_events` and `gallery` sheets as needed. Private details are only returned to admins. Other sheets, custom columns and supported styles are preserved. This is a data workbook; advanced Excel features such as macros are not supported.

Writes use an inter-process lock, validate the current data and detect external edits before atomic replacement. The previous workbook is saved as `.bak`. Saving fails explicitly if Excel has the workbook open or the form is stale. The data directory needs Modify permission. Multiple server processes must share the same workbook and lock directory. Birthdays are derived from member dates. Legacy `.xls` and direct CSV data sources are not supported.

Run `bun run lint`, `bun run typecheck`, `bun test` and `bun run build` to validate changes. Follow [DESIGN.md](DESIGN.md) for UI work. The original attribution and MIT license are in [LICENSE](LICENSE).
