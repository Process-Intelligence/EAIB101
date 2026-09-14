# EAIB101

Student page hosting for the **EAIB101** class, served from a Cloudflare Worker
using [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).

Every student has their own folder. Students submit a static HTML document and it
is served directly from Cloudflare's edge — there is no Worker script, no build
step and no framework.

## Groups

The semester has two program groups, and the homepage shows one tab per group:

| Group | `id` in `students.json` | Students |
| --- | --- | --- |
| Entrepreneur Program | `entrepreneur` | 27 |
| Financial Leadership Program | `financial-leadership` | 28 |

Student IDs are unique across both groups, so every student keeps one folder
under `public/student/` and a student's URL never changes if they move groups —
only their entry in `scripts/students.json` does.

## URLs

| Path | Serves |
| --- | --- |
| `/` | Class homepage — tabs for both groups, 55 students |
| `/#entrepreneur` | Homepage with the Entrepreneur Program tab open |
| `/#financial-leadership` | Homepage with the Financial Leadership tab open |
| `/student/<STUDENT_ID>/` | That student's page |
| anything else | `public/404.html` with a 404 status |

`/student/B26FA1091` (no trailing slash) redirects to `/student/B26FA1091/`.

## Layout

```
public/                                  <- everything in here is published
├── index.html                           <- class homepage (generated)
├── 404.html                             <- not-found page
└── student/
    ├── B26FA1091/index.html
    ├── B26FA1891/index.html
    └── ...                              <- 55 folders, one per student
scripts/
├── students.json                        <- the roster, grouped by program
├── roster.mjs                           <- loads + validates the roster
├── placeholder.mjs                      <- the "not submitted yet" page
├── scaffold.mjs                         <- creates missing student pages
└── build-index.mjs                      <- regenerates public/index.html
wrangler.jsonc                           <- Worker config (not published)
package.json
```

Only `public/` is uploaded. Config files live outside it, so they can never be
served by accident.

## Submitting work / Ажлаа илгээх

**English** — replace the whole file at `public/student/<YOUR_ID>/index.html`
with your own HTML. Keep the file name `index.html` and keep it inside your own
folder. Extra files (CSS, images, JS) can go in the same folder and be
referenced with relative paths, e.g. `<link rel="stylesheet" href="style.css">`.

**Монгол** — `public/student/<ӨӨРИЙН_КОД>/index.html` файлыг бүхэлд нь өөрийн
HTML-ээр солино уу. Файлын нэр `index.html` хэвээр байх ёстой бөгөөд зөвхөн
өөрийн фолдер дотор ажиллана. Нэмэлт файл (CSS, зураг, JS) -ыг мөн тэр фолдерт
хийж, харьцангуй замаар холбоно, жишээ нь `<link rel="stylesheet" href="style.css">`.

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

## The homepage

`public/index.html` is generated. It gives each group its own tab, marks every
student **Илгээсэн** (submitted) or **Хүлээгдэж буй** (pending), and shows a
count and progress bar per group plus a total in the header. A folder is
"pending" while it still holds the generated placeholder page.

Regenerate it after adding or replacing any student page:

```bash
npm run index
```

The output is committed — Cloudflare runs no build command, so whatever is in
`public/index.html` at push time is what ships.

The tabs are plain CSS (a hidden radio per group), so they work with JavaScript
disabled. The small inline script only keeps the URL hash in sync, which is what
makes `/#financial-leadership` shareable.

## Adding a student

1. Add `{ "id": "...", "name": "..." }` to the right group's `students` array in
   `scripts/students.json`.
2. Run `npm run scaffold` — it creates `public/student/<STUDENT_ID>/index.html`
   with the placeholder page. Existing files are never overwritten, so this is
   safe to re-run at any time.
3. Run `npm run index` and commit everything.

`npm run scaffold` and `npm run index` both refuse to run on a roster with a
duplicate student ID, and both warn about folders under `public/student/` that
no group claims.

## Adding a group

1. Append `{ "id": "...", "label": "...", "students": [...] }` to `groups` in
   `scripts/students.json`. The `id` must be URL-safe — it becomes the tab's
   deep link (`/#<id>`).
2. Run `npm run scaffold` then `npm run index`.

The homepage generates one tab per group, so no template edits are needed.

## Receiving a submission

Replace the whole of `public/student/<STUDENT_ID>/index.html` with the student's
file, then run `npm run index` so the homepage count updates.
