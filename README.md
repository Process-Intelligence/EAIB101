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

## URLs

| Path | Serves |
| --- | --- |
| `/` | Course overview — all 10 problem sets and their progress |
| `/ps/<SET_ID>/` | That problem set: the guidance, then both group tabs |
| `/ps/<SET_ID>/#entrepreneur` | That problem set with a group tab pre-opened |
| `/ps/<SET_ID>/<STUDENT_ID>/` | That student's submission for that problem set |
| `/student/<STUDENT_ID>/…` | Redirects to `/ps/01/…` (see `public/_redirects`) |
| anything else | `public/404.html` with a 404 status |

`/ps/01` (no trailing slash) redirects to `/ps/01/`.

Submissions lived at `/student/<ID>/` before the site was organised by problem
set. Everything there was a Problem Set 01 submission, so `public/_redirects`
sends those old links to their new home and nothing that was shared breaks.

## Layout

```
public/                                  <- everything in here is published
├── index.html                           <- course overview (generated)
├── 404.html                             <- not-found page
├── _redirects                           <- old /student/ links -> /ps/01/
├── assets/site.css                      <- shared stylesheet (generated)
└── ps/
    ├── 01/
    │   ├── index.html                   <- problem set page (generated)
    │   ├── B26FA1091/index.html         <- one folder per student
    │   └── ...                          <- 55 folders
    ├── 02/index.html                    <- planned set, no student folders yet
    └── ...                              <- 10 problem sets
scripts/
├── students.json                        <- the roster, grouped by program
├── problem-sets.json                    <- the 10 problem sets and their text
├── roster.mjs                           <- loads + validates both, counts state
├── layout.mjs                           <- stylesheet, sidebar, page shell
├── placeholder.mjs                      <- the "not submitted yet" page
├── scaffold.mjs                         <- creates missing student pages
└── build-site.mjs                       <- regenerates every generated page
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

Folders that still hold the generated placeholder have not been submitted yet.

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

Pushes to any other branch upload a preview version
(`npx wrangler versions upload`) rather than deploying to production, so student
submissions can be reviewed on a preview URL before they reach the live site.

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

Run it after adding or replacing any student page so the counts stay honest:

```bash
npm run index
```

The output is committed — Cloudflare runs no build command, so whatever is in
`public/` at push time is what ships.

Each problem set page puts the general explanation first, then a tab per group
with that group's roster and submission status. The tabs and the sidebar menu
are plain CSS (a hidden radio per group, a hidden checkbox for the mobile menu),
so they work with JavaScript disabled. The small inline script only keeps the
URL hash in sync, which is what makes `/ps/01/#financial-leadership` shareable.

Student submissions are never written by the build — they are read only, to
count who has submitted.

## Receiving a submission

Replace the whole of `public/ps/<SET_ID>/<STUDENT_ID>/index.html` with the
student's file, then run `npm run index` so the counts update.

## Adding a student

1. Add `{ "id": "...", "name": "..." }` to the right group's `students` array in
   `scripts/students.json`.
2. Run `npm run scaffold` — it creates the placeholder page for every published
   problem set. Existing files are never overwritten, so it cannot destroy a
   submission and is safe to re-run.
3. Run `npm run index` and commit everything.

## Publishing a problem set

Problem sets live in `scripts/problem-sets.json`. A set with
`"status": "planned"` shows a "not open yet" page — both group tabs and the full
roster, but no student folders and no links. To open one:

1. Fill in its `title` and the guidance fields, and set `"status": "published"`.
2. Run `npm run scaffold` to create the 55 student folders, then `npm run index`.

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

## Validation

`npm run scaffold` and `npm run index` both refuse to run when:

- two students share an ID (they would share a folder)
- a group or problem set ID is missing or not URL-safe
- a problem set is `published` with no title, or has an unknown block type

Both also warn about folders under `public/ps/<SET_ID>/` that no group claims,
and about roster entries with no `index.html`.
