# EAIB101

Student page hosting for **EAIB101 — AI & Prompt Engineering**, served from a
Cloudflare Worker using
[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).

The course has **10 problem sets** and **2 program groups**. Each student submits
one static HTML document per problem set, served directly from Cloudflare's edge
— there is no Worker script, no build step and no framework.

## Groups

Every problem set page shows one tab per group:

| Group | `id` in `students.json` | Students |
| --- | --- | --- |
| Энтрепренершип хөтөлбөр | `entrepreneur` | 27 |
| Санхүүгийн манлайлал хөтөлбөр | `financial-leadership` | 28 |

Student IDs are unique across both groups, so a student's URL never changes if
they move groups — only their entry in `scripts/students.json` does.

From Problem Set 02 on, the financial leadership group hands in **one page per
team** — 7 teams, `FLP-1` … `FLP-7` — see [Teams](#teams). The entrepreneurship
group still hands in one page per student.

## URLs

| Path | Serves |
| --- | --- |
| `/` | Course overview — all 10 problem sets and their progress |
| `/ps/<SET_ID>/` | That problem set: both group tabs and the roster, then the guidance |
| `/ps/<SET_ID>/#entrepreneur` | That problem set with a group tab pre-opened |
| `/ps/<SET_ID>/<STUDENT_ID>/` | That student's submission for that problem set |
| `/ps/<SET_ID>/<TEAM_ID>/` | A team's page for a set handed in by team: the members, then the team's work |
| `/student/<STUDENT_ID>/…` | Redirects to `/ps/01/…` (see `public/_redirects`) |
| anything else | `public/404.html` with a 404 status |

`/ps/01` (no trailing slash) redirects to `/ps/01/`. IDs in URLs are
case-sensitive: `/ps/01/b26fa1091/` is not `/ps/01/B26FA1091/`.

Submissions lived at `/student/<ID>/` before the site was organised by problem
set. Everything there was a Problem Set 01 submission, so `public/_redirects`
sends those old links to their new home and nothing that was shared breaks.

## Layout

```
public/                                  <- everything in here is published
├── index.html                           <- course overview (generated)
├── 404.html                             <- not-found page (generated)
├── _redirects                           <- old /student/ links -> /ps/01/
├── _headers                             <- response headers (security, caching)
├── assets/site.css                      <- shared stylesheet (generated)
└── ps/
    ├── 01/
    │   ├── index.html                   <- problem set page (generated)
    │   ├── B26FA1091/index.html         <- one folder per student
    │   └── ...                          <- 55 folders
    ├── 02/
    │   ├── index.html                   <- problem set page (generated)
    │   ├── B26FA1091/index.html         <- entrepreneurship: one folder per student
    │   ├── FLP-1/
    │   │   ├── index.html               <- team page: members + work (generated)
    │   │   └── work.html                <- the team's own page, once handed in
    │   └── ...
    ├── 05/index.html                    <- planned set, no student folders yet
    └── ...                              <- 10 problem sets
scripts/
├── students.json                        <- the roster, grouped by program
├── problem-sets.json                    <- the 10 problem sets and their text
├── roster.mjs                           <- loads + validates both, counts state
├── layout.mjs                           <- stylesheet, sidebar, page shell
├── placeholder.mjs                      <- the "not submitted yet" page
├── scaffold.mjs                         <- creates missing student pages
└── build-site.mjs                       <- regenerates every generated page
docs/                                    <- audits and notes (not published)
wrangler.jsonc                           <- Worker config (not published)
package.json
```

Only `public/` is uploaded. Config files live outside it, so they can never be
served by accident. Cloudflare reads `_redirects` natively and does not serve it.

## Submitting work / Ажлаа илгээх

**English** — replace the whole file at
`public/ps/<SET_ID>/<YOUR_ID>/index.html` with your own HTML. Keep the file name
`index.html` and keep it inside your own folder. Extra files (CSS, images, JS)
can go in the same folder and be referenced with relative paths, e.g.
`<link rel="stylesheet" href="style.css">`.

**Монгол** — `public/ps/<БОДЛОГЫН_ДУГААР>/<ӨӨРИЙН_КОД>/index.html` файлыг
бүхэлд нь өөрийн HTML-ээр солино уу. Файлын нэр `index.html` хэвээр байх ёстой
бөгөөд зөвхөн өөрийн фолдер дотор ажиллана. Нэмэлт файл (CSS, зураг, JS) -ыг мөн
тэр фолдерт хийж, харьцангуй замаар холбоно, жишээ нь
`<link rel="stylesheet" href="style.css">`.

**Teams / Баг** — a team's work goes in `public/ps/<SET_ID>/<TEAM_ID>/work.html`,
not `index.html`: the team's `index.html` is generated and shows the members
above the work. Extra files go in the same folder, as above.
Багийн ажлыг `public/ps/<БОДЛОГЫН_ДУГААР>/<БАГИЙН_КОД>/work.html` файлд
байрлуулна; `index.html` нь багийн гишүүдийг харуулдаг автоматаар үүсгэгддэг хуудас.

Folders that still hold the generated placeholder have not been submitted yet.
The build recognises a placeholder by the `<!-- eaib101:placeholder -->`
comment it carries, so a real submission is never mistaken for one by its
wording. A file that is empty or is not an HTML document is counted as pending
too, and named in the build output, so an upload that went wrong is noticed.

## Brand

The site carries the University of Finance and Economics brand. Everything
about it lives in `scripts/brand.mjs` — the university's names and website,
the logo files, and the whole colour palette for light and dark schemes — and
in three files under `public/assets/`:

| File | Used for |
| --- | --- |
| `ufe-logo.png` | The logo on light backgrounds (sidebar, placeholder, 404) |
| `ufe-logo-white.png` | The same logo, white, swapped in by `<picture>` in dark mode |
| `ufe-mark.png` | The shield emblem, inlined as the favicon of every page |
| `process-intelligence.png` | The site builder's mark, in every footer |

`process-intelligence.png` is the mark of Process Intelligence LLC, who built
the site; it is credited with a link to <https://prointel.tech/> in the footer
of every generated page (`madeBy` in `brand.mjs`).

The brand blue, `#0045e7`, is read from the logo itself; the dark scheme lifts
it to `#7fa3ff` so it still reads as text. After changing anything in
`brand.mjs` or replacing a logo file, run `npm run scaffold -- --refresh` (the
placeholder pages inline the palette and favicon) and then `npm run index`.
Keep every text/background pair at or above 4.5:1 — the comment at the top of
`brand.mjs` lists which pairs matter.

## Local preview

```bash
npm install        # once
npm run dev        # http://localhost:8787
```

## Deploy

Deploys are **automatic**. This Worker is connected to this repository through
[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), so
every push to `main` builds and deploys the site. There is no build step — the
deploy command uploads `public/` straight to Cloudflare.

| Build setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | none |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

If the Workers Builds setting for non-production branches is on (a dashboard
setting, not recorded in this repository), pushes to other branches upload a
preview version (`npx wrangler versions upload`) rather than deploying to
production, so student submissions can be reviewed on a preview URL first.

`public/_headers` sets a few security headers on every response and lets
browsers cache `/assets/site.css` for a year — every generated page links it
with a content hash (`?v=…`), so a redesign still reaches everyone at once.

Build status and logs live in the Cloudflare dashboard under
**Workers & Pages → `eaib101` → Settings → Builds**. A build typically takes a
couple of minutes; the site is live once the build reports success.

> The Worker name in the Cloudflare dashboard must match `name` in
> `wrangler.jsonc` — both are `eaib101`. If they ever diverge, builds fail.

### Deploying by hand

Only needed if the Git integration is disconnected:

```bash
npm install
npx wrangler login
npm run deploy
```

This publishes to `eaib101.<your-subdomain>.workers.dev`. Change `name` in
`wrangler.jsonc` to use a different Worker name, or attach a custom domain from
the Cloudflare dashboard.

## Generated pages

`npm run index` regenerates, from `students.json` and `problem-sets.json`:

- `public/assets/site.css` — the shared stylesheet for every generated page
- `public/index.html` — the course overview
- `public/ps/<SET_ID>/index.html` — one page per problem set
- `public/404.html` — the not-found page

Run it after adding or replacing any student page so the counts stay honest,
and `npm run check` before pushing — it writes nothing and exits non-zero if
any generated page is out of date:

```bash
npm run index
npm run check
```

The output is committed — Cloudflare runs no build command, so whatever is in
`public/` at push time is what ships.

An open problem set page leads with what people come for: the counts, then a
tab per group with that group's roster and submission status, then the
guidance, with a jump link between them. A set that is not open yet shows its
introduction first. The tabs and the sidebar menu are plain CSS (a hidden radio
per group, a hidden checkbox for the mobile menu), so they work with JavaScript
disabled. The small inline script only selects the tab named in the URL hash
and keeps the hash in sync, which is what makes `/ps/01/#financial-leadership`
shareable; without it the same link still scrolls to the tab bar.

Student submissions are never written by the build — they are read only, to
count who has submitted.

## Receiving a submission

Replace the whole of `public/ps/<SET_ID>/<STUDENT_ID>/index.html` with the
student's file, then run `npm run index` so the counts update. For a team, save
the team's file as `public/ps/<SET_ID>/<TEAM_ID>/work.html` instead and run
`npm run index` — that also rebuilds the team page so it shows the work. If a
team's work lands in its `index.html` by mistake, the build stops rather than
overwrite it. The build
prints a note for any submitted page that loads assets from the internet or
has no viewport tag — worth a look, but it does not change the count.

## Adding a student

1. Add `{ "id": "...", "name": "..." }` to the right group's `students` array in
   `scripts/students.json`.
2. Run `npm run scaffold` — it creates the placeholder page for every published
   problem set. Existing files are never overwritten, so it cannot destroy a
   submission and is safe to re-run.
3. Run `npm run index` and commit everything.

## Changing the placeholder page

`scripts/placeholder.mjs` is only written to disk when a page is created, so
after editing it run:

```bash
npm run scaffold -- --refresh
```

That rewrites every page that still holds a generated placeholder — and only
those; a submitted page is never touched — then run `npm run index`.

## Publishing a problem set

Problem sets live in `scripts/problem-sets.json`. A set with
`"status": "planned"` shows a "not open yet" page — both group tabs and the full
roster, but no student folders and no links. To open one:

1. Fill in its `title` and the guidance fields, and set `"status": "published"`.
   A set may open before its brief is written: without a title it is called
   "Бодлого <id>", and without a task its page says the brief is still to come.
2. Run `npm run scaffold` to create the student folders, then `npm run index`.

Add `"submission": "team"` to a set that is handed in by team (see
[Teams](#teams)); leave it out, or say `"individual"`, otherwise.

The guidance fields are:

| Field | Shown as |
| --- | --- |
| `title`, `tagline` | The page heading and its one-line subtitle |
| `session`, `flow` | Chips next to the open/closed status |
| `task` | The paragraph under **The task** |
| `sources` | The chips under **Where to look** |
| `steps` | One card per step |

Each step is `{ n, title, lead?, intro?, blocks }`, and each block is one of:

- `{ "type": "list", "title"?, "items": [...] }`
- `{ "type": "code", "title"?, "text": "..." }` — rendered in a `<pre>`
- `{ "type": "note", "text": "..." }` — the highlighted callout

All guidance text is escaped when rendered, so it is plain text, not HTML.

## Adding a group

1. Append `{ "id": "...", "label": "...", "students": [...] }` to `groups` in
   `scripts/students.json`. The `id` must be URL-safe — it becomes the tab's
   deep link (`/ps/01/#<id>`).
2. Run `npm run scaffold` then `npm run index`.

Every problem set page generates one tab per group, so no template edits are
needed.

## Teams

A group can be split into teams by adding `teams` next to its `students` in
`scripts/students.json`:

```json
"teams": [
  { "id": "FLP-1", "name": "Баг 1", "members": ["B26FA1843", "B26FA1842", "B26FA1825"] }
]
```

`members` are student IDs from the same group. In a problem set marked
`"submission": "team"`, a group with teams hands in once per team and a group
without teams carries on student by student. For each team the build writes
`public/ps/<SET_ID>/<TEAM_ID>/index.html` — the team's name and members, then
its `work.html` in a frame below them, or a "not handed in yet" note — so
`scaffold` creates nothing for teams. A team's row on the problem set page lists
its members, and students on no team are named under the group's roster.

Team IDs share the folder namespace with student IDs, so they must not match a
student ID. Changing `teams` changes every team set at once; the folder of a
team that no longer exists is kept and reported as not belonging to the set.

## Validation

`npm run scaffold` and `npm run index` both refuse to run when:

- two students share an ID, or have IDs that differ only by case (they would
  share a folder on macOS and Windows)
- a group, student or problem set ID is missing or not URL-safe (letters,
  digits, `_` and `-` only)
- a student, group or problem set is missing its name, label or title, or a
  group has no students
- a team ID is missing, not URL-safe or taken by a student or another team, a
  team has no name or members, lists a student from another group, or shares a
  student with another team
- a problem set's `submission` is not `individual` or `team`, a step has no `n`
  or title, a list block has no items, or a code/note block has no text

Both also warn about: students on no team in a group that has teams, folders
under `public/ps/<SET_ID>/` that are not a student or team of that set, stray
files there, a planned set that still has student folders,
two students in one group with the same name, a roster entry with no
`index.html`, a folder holding files under another name (`index.htm`) — which
`scaffold` leaves alone rather than covering with a placeholder — and, from
`index`, pages that are empty, not HTML, or an out-of-date placeholder.
