<p align="center">
  <img src="https://raw.githubusercontent.com/homielab/giapha-os/main/public/icon.png" alt="Gia Pha OS Icon" width="100" height="100" style="border-radius: 22%; border: 0.5px solid rgba(0,0,0,0.1);" />
</p>

# Gia Pha OS (Gia Pha Open Source)

[English](README.en.md) | [Tiếng Việt](README.md)

This personal fork lets guests read the family tree at `/dashboard`. Admins use the login button at the top right to edit it. Data and images currently use Supabase.

An open-source family genealogy application with an intuitive interface for exploring family trees, managing members, and finding Vietnamese kinship terms.

The project was created to solve a practical need: a cloud-based system that allows family members in different places to update information together, such as marriages and births, instead of relying on a single local computer. Self-hosting this open-source project gives your family full control over sensitive data rather than handing it to third-party services. I initially built it for my own family, but decided to share it publicly after receiving interest from others.

Designed primarily for Vietnamese families.

## Table of contents

- [Accessing the family tree](#accessing-the-family-tree)
- [Key features](#key-features)
- [Demo](#demo)
- [Screenshots](#screenshots)
- [Installation and running the project](#installation-and-running-the-project)
  - [Option 1: Deploy to Vercel](#option-1-deploy-to-vercel)
  - [Option 2: Run locally](#option-2-run-locally)
- [Contributing](#contributing)
- [Disclaimer and privacy](#disclaimer-and-privacy)
- [License](#license)

## Key features

- **Interactive family trees**: Explore your genealogy as a Tree, Mindmap or Bubble view. On the tree, drag, Ctrl/⌘ + scroll or pinch with two fingers to zoom around the pointer or fingers; the +/- buttons keep what is in the middle of the view in place. It also works from the keyboard: Tab into the tree, then `+`/`-` to zoom, `0` to reset and the arrow keys to scroll; in the Bubble view, Tab through the families and press Enter or Space to select one.
- **Image and PDF export**: Export the tree as an image, a single-page PDF, or a multi-page A4/A3 PDF (with an overlap for gluing sheets together and a "row,column" label on each page; portrait or landscape, whichever takes fewer sheets, following the tree's shape on a tie). The branch expand/collapse buttons are left out of the exported file. Large trees are rendered at a lower resolution to fit the browser's canvas limits; a tree too large for any canvas asks you to pick a smaller root.
- **Kinship finder**: Automatically determine accurate Vietnamese forms of address, such as uncle, aunt, or cousin; a person whose gender is "Other" gets the form shared by both genders ("Vợ/Chồng", "Bố/Mẹ", "Anh/Chị", "Con dâu/Con rể") with a note saying why. Who is older: siblings with the same parents go by birth order, then birth date; half siblings (and step siblings) go by birth date first and use the birth order only when the dates are missing, because the children of each wife are often numbered on their own.
- **Member management**: Store member information and avatars, and organize family branches; deceased members get a "Burial place" field (e.g. "X Cemetery, Y commune", public like the dates of death) shown on the member page, the printed profile and the family book, so descendants know where to visit the grave; accent-insensitive search (also in the member pickers on the Kinship page and the relationship form), usable from the keyboard (arrows, Enter, Esc); press ⌘/Ctrl + K on any Dashboard page to jump to a member (it tells how many match, up to 20).
- **Relationship management**: Manage family relationships, including special cases such as polygamous relationships.
- **Data checks**: Warnings for impossible relationships (parent-child loops, a child born before a parent, a mother who died before the child's birth, a father who died long before it) and for people with the same name and birth year.
- **Statistics and events**: Track birthdays, death anniversaries (Vietnamese lunar calendar), custom events and family demographic statistics (including lifespan: average, longest-lived, oldest living member, by birth decade); admins get "recompute lunar death dates" and "possible duplicates" tools.
- **Add to calendar**: The Events page has an "Add to calendar (.ics)" button to import birthdays, anniversaries and events into Google/Apple Calendar and get reminders on your phone.
- **Print a profile**: the member page has a "Print profile" button; the A4 printout has no header, footer or edit buttons and includes the photo, the full note and the family list, ready to hand out, keep at the ancestral hall or archive.
- **Family book**: the Lineage page opens the "Family book", the whole tree as a printable book, generation by generation: a cover with the main surname, the print date and a table of contents; each generation starts on its own page with numbered members listing other names, birth and death dates, the lunar death date, the burial place, parents, spouses (in-law marked), children in birth order (tap to jump to their entry) and the note; members without a generation get their own section at the end.
- **Data backup**: Export and import JSON, CSV, and GEDCOM files for easy storage or migration; the restore file is previewed before anything is replaced. A chosen file can be imported two ways: **Replace the whole tree** (restore a backup: the current data is deleted and replaced by the file) or **Add to the current tree** (e.g. a relative sends their branch as JSON, GEDCOM or CSV ZIP): every member and event of the file gets a new id and is inserted in one transaction, without deleting or changing existing data; profile photos are not imported. People in both the file and the tree end up as two profiles (adding a file twice also makes two copies): after adding, click "Scan for duplicates now" to run Possible duplicates and merge them, which also links the new branch to the tree. Photos (avatars, gallery) are not included in JSON/CSV/GEDCOM (the `gallery_items` table is also not included in backups); copy the Supabase Storage buckets `avatars` and `gallery` separately (Dashboard Storage → download, or `supabase storage` CLI). CSV cells starting with `=`, `+`, `-` or `@` get a leading `'` on export so spreadsheets don't run them as formulas (a phone number `+84…` shows as `'+84…` in Excel); that `'` is removed again on import. When restoring a CSV ZIP, a file with a row that has fewer or more cells than the header, or a broken double quote, is rejected as soon as it is chosen, with the file name and line (nothing is deleted); blank lines are skipped.
- **Responsive, bilingual**: A modern interface optimized for desktop and mobile devices, switchable between Vietnamese and English (the first visit follows the browser: English when it prefers English, Vietnamese otherwise).
- **Install on the home screen**: a web app manifest and app icons, so "Add to Home Screen" on a phone shows the site name "Gia Phả OS" (change it with `SITE_NAME`/`SHORT_NAME`) and opens the dashboard directly. There is no service worker, so a connection is still required.

### Lunar calendar and death anniversaries

The app uses the Vietnamese lunar calendar (computed for UTC+7 with Hồ Ngọc Đức's algorithm), not the Chinese one (UTC+8): in some years the two differ by a day or a whole month (Tết 2007 is February 17 in Vietnam, February 18 in China). Death anniversaries are recomputed every year on the lunar calendar:

- **First anniversary**: anniversaries start in the lunar year after the year of death (taken from the lunar year of death, else from the solar date of death); the year of death itself has none, on the Events page and in the .ics file. With an unknown year of death, every year has one.
- **Day 30 in a 29-day month**: in a year where that month has only 29 days, the anniversary falls on day 29 (the last day of the month).
- **Death in a leap month**: in a year with the same leap month, the anniversary falls in the leap month; otherwise in the regular month with the same number. The leap month is known from the solar date of death; a lunar date typed in by hand is read as a regular month.
- **Time zone and 29 February**: "today" for upcoming events is always the date in Vietnam (UTC+7), on the server and in the browser, so anniversaries and birthdays are not a day off between midnight and 7 a.m. A 29 February birthday falls on 28 February in a common year.
- **Unknown year of death**: with only a solar day and month of death (no year and no lunar date), the anniversary is converted to the lunar calendar using the current year and shown as "(estimated)"; enter the year of death or the lunar date for a fixed anniversary.
- **Lunar dates saved by older versions**: before the switch to the Vietnamese lunar calendar, lunar dates were computed with the Chinese calendar and are not recomputed automatically. An administrator opens **Dashboard → Backup & Restore → Recompute lunar death dates** and clicks "Check death anniversaries" to list members whose stored lunar date differs from the one computed from the solar date of death (only people with a full day/month/year on both dates). No row is selected by default; select rows one by one or all, then confirm to apply. Do not select a row whose lunar date was typed by hand (the solar date derived from it may be wrong). Export a JSON backup first. Each row is updated on its own and only if the date of death has not been edited since the check; rows that fail or are skipped show up again at the next check. The tool never runs by itself and needs no migration.

- **Possible duplicates**: **Dashboard → Backup & Restore → Possible duplicates**, click "Scan for possible duplicates" to scan the whole tree (including data imported from GEDCOM/CSV). Two members share a group when their names are equal (ignoring accents and case) and they have the same birth year, or the same name and a shared parent. Each group lists birth – death years, the number of relationships and a link to open the profile (first 200 groups, the rest is counted). View only: nothing is changed, deleted or merged; fix or delete with the usual tools. No migration needed.
- **Data check**: **Dashboard → Backup & Restore → Data check**, click "Check the data" to scan the whole tree (including data imported from GEDCOM/CSV) for impossible dates: death before birth, a child born after the mother died, a father who died more than 10 months before the child was born, a parent less than 12 or more than 70 years older than the child (only when both birth years are known; adopted children are skipped), birth or death dates that have not come yet, repeated marriage or parent–child links, a child with too many biological parents, parent–child loops (each person on the loop is named and linked), people with a marriage or parent–child link to themselves, a biological child whose generation is not the parent's plus one (only when both generations are set; in-laws and adopted children are skipped), children of the same pair of parents who share a birth order or whose birth order runs against their known birth dates (birth orders are compared only within the same pair of parents, so children of two wives numbered separately or straight through are both fine; a child with only one recorded parent is compared with the other children of that parent alone; adopted children skipped), people with no parent, spouse or child at all (often a GEDCOM family record lost on import; not checked in a tree of one person), people with a date of death (solar or lunar) who are not marked deceased (usually from a CSV/JSON import; they get no death anniversary and count as living), people older than 120 (living with no date of death at all, often an old GEDCOM/CSV tree missing the death, or died more than 120 years after the birth year); plus a "Missing info" group: no birth year, deceased but no death year, gender unknown. Results are grouped by kind with counts and a link to open each profile (first 200 of each kind). View only: nothing is changed; members not connected to the root are on the Lineage page. No migration needed.

### Add events to a calendar (.ics)

On **Dashboard → Events**, the **Add to calendar (.ics)** button downloads `giapha-events.ics`, which you can import into Google Calendar, Apple Calendar, Outlook and others:

- **Birthdays** of living members: one all-day event repeating every year (a 29 Feb birthday falls on 28 Feb in a common year).
- **Death anniversaries**: a lunar date cannot repeat yearly on the solar calendar, so each year is its own event. The file holds this year's and next year's anniversaries (the same solar dates as the Events page, marked "estimated" when the death year is missing). Download it again next year.
- **Custom events**: on their own date, with the location and notes you entered. An "Every year (solar calendar)" event is one event repeating yearly from its first date (29 Feb falls on the last day of February); an "Every year (lunar calendar)" event works like a death anniversary: one event for each occurrence this year and next year.

Every event has a UID that is stable per member, so importing the file again into the same calendar updates events instead of duplicating them. The file is generated in the browser, with no server or email involved; reminders are handled by your calendar app.

### GEDCOM

Export and import GEDCOM (7.0) to open the family tree in Gramps, MyHeritage… or import it back:

- **Names**: the first word of the full name is the surname: `Nguyễn Văn An` is written `1 NAME /Nguyễn/ Văn An` with `2 SURN Nguyễn` and `2 GIVN Văn An`. On import the app prefers `SURN`/`GIVN` (keeping the surname–given-name order of the `NAME` line); without them it reads `NAME` and drops the `/` marks, so files exported by older versions read as before.
- **Families (FAM)**: each child belongs to the family of their own parent pair (a second wife's child is in the family with the second wife); a child linked to only one person (father, mother or a person with gender "other") gets a single-parent family. A person with gender "other" is written in the `HUSB` position.
- **Adopted children**: written as `2 PEDI ADOPTED` under `1 FAMC`; on import, `PEDI ADOPTED` becomes an adoptive relationship.
- **Dates**: GEDCOM has no date without a month or without a year, so a date with day + year but no month exports only the year. A birth or death date with day + month but no year (a birthday or death anniversary whose year is unknown) is written with the custom tag `2 _DATEDM <day> <month>` under `1 BIRT`/`1 DEAT` and read back on import (other programs ignore it); any other date without a year (month only) is dropped.
- **Other names**: each name in `other_names` (separated by commas or semicolons) is written as its own `1 NAME` with `2 TYPE aka`; on import, the second and later `NAME` records are joined back into other names.
- **Burial place**: written as `1 BURI` + `2 PLAC <burial place>` (standard GEDCOM, read by Gramps, MyHeritage…); on import, the `PLAC` under `BURI` becomes the burial place and marks the person as deceased.
- **Place of birth, place of death, occupation**: the app has no fields for these. On import, the `PLAC` under `BIRT`, the `PLAC` under `DEAT` and each `1 OCCU` are added to the end of the person's note as `Nơi sinh: …`, `Nơi mất: …`, `Nghề nghiệp: …` (after the existing note and the date-range lines); a `PLAC` under `DEAT` marks the person as deceased. On export these lines stay in the note (no `PLAC`/`OCCU` is written), so importing the file again does not repeat them.
- **Notes**: long notes are split into `CONC` lines (≤ 255 characters), line breaks become `CONT`. On import both inline notes and **pointer notes** (`1 NOTE @N1@` pointing to `0 @N1@ NOTE …`, as written by Gramps, Family Tree Maker, Legacy, Ancestry, and the GEDCOM 7 `SNOTE`) are supported; several notes of one person are joined, and a pointer to a note that is not in the file is ignored and counted in a warning of the restore confirmation. A marriage's note is exported as `1 NOTE` in the couple's `FAM` record; on import, the `NOTE`s of a `FAM` (inline or pointer) become the marriage's note, ahead of its `Nguồn: …` lines. A `FAM` with only a husband or only a wife has no marriage to hold its notes and sources: they are dropped (not given to anyone else) and counted in the restore confirmation's warning.
- **Sources**: the app has no source table. On import, each `SOUR @S1@` citation of a person (also under events such as `BIRT`) or a family is copied into the person's or marriage's note as `Nguồn: <TITL or ABBR>` (plus `TEXT` when present); `REPO` records are not kept. The restore confirmation tells how many SOUR/REPO records the file has. The header's `1 SOUR` line (the exporting program) is not counted.
- **Lunar death anniversary**: GEDCOM has no lunar calendar, so the lunar date of death is written with the custom tag `2 _LUNAR <day> <month> [<year>] [LEAP]` under `1 DEAT` (the year is left out when unknown) and read back on import. Other programs ignore it. The `LEAP` flag exists only in GEDCOM files (the database does not store leap months).
- **Long notes and date ranges**: import reads both `CONC` (joined without a line break) and `CONT`, so long notes from MyHeritage or Ancestry are no longer cut. `BET a AND b` and `FROM a TO b` keep the first date and append the original text to the note (`BIRT: BET 1850 AND 1855`); `@#DJULIAN@` escapes and ABT/EST/AFT/BEF/CAL prefixes are ignored.
- **Generation, birth order, in-law flag**: written with the custom tags `1 _GEN <number>`, `1 _ORDER <number>`, `1 _INLAW Y` under each person, only when set, and read back on import (moving a tree between two installs keeps the order of children and the in-law flag). Other programs ignore these tags; files without them import as before.
- Not exported: profile photos and photo gallery (files in Supabase Storage buckets `avatars` and `gallery` must be copied separately).

### Data checks

- **Relationships**: before saving, the app refuses a link from a person to themselves, a couple that is already married (A–B and B–A count as the same), a parent–child link that would create a loop (making a grandchild the parent of their grandfather) and a child born before the parent. Birth dates are compared as far as both people have them: year, then month, then day; without a birth year this check is skipped. The "add several children" form checks every row before creating anyone: birth year and birth order must be whole numbers (year from 1 to the current year, order from 1), and the birth year is compared with the parents; errors name the child.
- **Death date**: cannot be before the birth date, comparing month and day within the same year.
- **Name**: a name of only spaces is refused; extra spaces at the ends are trimmed when saving.
- **Possible duplicates**: creating a member with the same name (ignoring accents and case) and birth year as an existing one (two members without a birth year match on the name alone) asks first and lists them; Continue creates it anyway. Editing never asks.
- **Parents' death dates**: a mother who died before the child's birth is refused (when adding the link and when editing birth or death dates); a father who died more than 10 months before the birth (more than 1 year when a month or day is missing) asks for confirmation. Adopted children are not checked.
- **JSON backup version**: files carry a `version` (currently 3). On restore, a file without `version` is read as version 1 (old file); a file with a higher version than the app reads is refused with a hint to upgrade the app, so new columns are not lost.

### Photo gallery

- Accepts JPG, PNG, GIF and WEBP up to 20 MB (GIFs up to 10 MB, as they are stored unchanged), whether picked with the file button or dragged in. The app reads the start of the file to find the real image type (a text file renamed to `.jpg` is refused) and sets the extension in the `gallery` bucket from that type, not from the file name. Before uploading, the browser scales photos down to at most 2048 px on the long side and stores them as WebP (a 6 MB phone photo ends up under 1 MB); GIFs, animated WebP and images that are already small are kept as they are; the stored file must still be under 10 MB. Photos uploaded earlier are not changed.
- Each page shows 24 images (`/dashboard/gallery?page=2`…); the signed links for the whole page are created in one Supabase Storage call, valid for 1 hour. A page past the end shows the last page.

### Profile photos

- Profile photos live in the private `avatars` bucket and only activated accounts can see them. The members page (tree, list, mindmap, bubble view) and the kinship page sign the links of every photo on the page in one Supabase Storage call on the server, valid for 24 hours. The server reuses each link for 12 hours (until the photo changes), so the browser keeps the photos in its cache when moving between pages; the cache sits in the server's memory and is used only after checking that the account is active. A photo changed since, other pages and tabs left open past that time load through `/api/avatar`. A copied link opens the photo until it expires, as before but for up to 24 hours instead of 1.
- When you pick a photo, the app reads the start of the file to find its real type (JPG, PNG, GIF, WEBP; a text file renamed to `.jpg` is refused) and stores it with that extension, not the one in the file name.

## Demo

This is the upstream project demo; the personal fork uses an admin login dialog on the current page.

- Demo: [giapha-os.homielab.com](https://giapha-os.homielab.com)

## Screenshots

![Dashboard](docs/screenshots/dashboard.png)

![Member list](docs/screenshots/list.png)

![Family tree](docs/screenshots/tree.png)

![Mindmap](docs/screenshots/mindmap.png)

![Statistics](docs/screenshots/stats.png)

![Kinship finder](docs/screenshots/kinship.png)

![Events](docs/screenshots/events.png)

More screenshots: [docs/screenshots/](docs/screenshots/)

## Installation and running the project

You can set up a family genealogy system in about 10–15 minutes.

---

## 1. Create a database (free with Supabase)

1. Create a free account at https://github.com if you do not already have one.
2. Create a free account at https://supabase.com if you do not already have one. Signing up with GitHub is recommended for a faster setup.
3. Create a **New Project** and wait about 1–2 minutes for initialization to finish.
4. Open **Project → Connect** or **Project Settings → API Keys** and obtain:
   - `Project URL`
   - `Publishable key` (starts with `sb_publishable_`; older projects may show an `anon` key)

---

## Option 1: Deploy to Vercel

Import your repository and select the `dev` branch. Configure `SITE_NAME`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` using `.env.example`. `SUPABASE_DB_URL` is optional for the Dashboard migration tool that is still included. This fork does not require SSO, a service-role key or approval email configuration.

## Option 2: Run locally

Requirements: [Node.js](https://nodejs.org/en) and [Bun](https://bun.sh/)

1. Clone or download the project.
2. Rename `.env.example` to `.env.local`.
3. Open `.env.local` and enter the values saved in **step 1**.

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key"
```

4. Install dependencies:

```bash
bun install
```

5. Start the project:

```bash
bun run dev
```

Open a browser and visit `http://localhost:3000`.

---

## Accessing the family tree

Guests can open `/dashboard` directly without add/edit/delete controls. The **Log in** button opens a dialog on the current page. The default local account is **admin / admin**; email and Supabase Auth are not required. Override it with `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env.local`, and change the password before a public deployment. There are no sign-up, SSO or account management screens.

Logging in or out refreshes permissions while retaining the current view and filters. Logging out from a member creation/editing page returns to the corresponding reading page.

The server checks credentials and stores a signed HttpOnly session cookie that expires after one day in both the browser and the server; the code is in `app/actions/auth.ts`. Supabase still stores data and images. The local session is separate from Supabase Auth and does not grant database permissions. Database schema and policies are unchanged and will be handled separately.

The interface and genealogy operations continue to use upstream components; the login dialog reuses `AuthField` from `components/auth/AuthFormParts.tsx`. Sign-up, SSO, account management and approval flows have been removed. When updating upstream, preserve local login and guest read-only controls.

### System upgrades in the Dashboard

Administrators can open **System upgrade** from the administration menu to check the source code version on GitHub and the database version, then run pending migrations. If the current source code is older than the latest GitHub version, the system requires the source code to be updated before migrations can run. Direct migration support requires `SUPABASE_DB_URL` on the server. Without it, `/dashboard/upgrade` still provides the SQL bundle from `/setup` for manual execution.

### Source code updates

When `/dashboard/upgrade` reports that the source code is outdated, update the **entire source tree** to the latest version. Do not only change the `version` number in `package.json` to bypass the warning, because migrations may require corresponding code changes.

**If deployed on Vercel:**

1. Confirm that the Vercel project is linked to the correct `homielab/giapha-os` repository and deployment branch.
2. Synchronize that branch with the latest GitHub code. If updating from a local Git checkout:

   ```bash
   git fetch origin
   git pull --ff-only origin dev
   git push origin dev
   ```

3. Wait for Vercel to finish building and deploying. If it does not deploy automatically, open **Deployments** and choose **Redeploy** on the latest deployment.
4. Reopen `/dashboard/upgrade`, click **Check again**, and confirm that the current version is not lower than the GitHub version.

**If running locally or self-hosted:**

```bash
git fetch origin
git pull --ff-only origin dev
bun install
bun run build
```

Restart the application with the command you use, such as `bun run start`. Once the source code is updated, an administrator can return to `/dashboard/upgrade` and run the database migrations. Back up the database before upgrading. If `SUPABASE_DB_URL` is not configured, use the SQL bundle at `/setup` as described above.

---

## Contributing

This is an open-source project. Contributions, issue reports, and pull requests are welcome.

## Disclaimer and privacy

> **This project provides source code only. The author does not collect or store any personal data.**

- **Fully self-hosted:** When you deploy the application, all family tree data—names, birth dates, relationships, contact information, and more—is stored **in your own Supabase account**. The project author has no access to that database.

- **No data collection:** The source code includes no analytics, tracking, telemetry, or other form of user data collection.

- **You control your data:** All family data and member information remains in the Supabase database you create and manage. You can delete, export, or move it at any time.

- **Public demo:** The demo at `giapha-os.homielab.com` uses fictional sample data and contains no information about real people. Do not enter real personal information on the demo site.

## License

This project is distributed under the [MIT License](LICENSE). Copyright (c) 2026 HomieLab.
