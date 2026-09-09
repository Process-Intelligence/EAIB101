# EAIB101

Student page hosting for the **EAIB101** class, served from a Cloudflare Worker
using [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).

Every student has their own folder. Students submit a static HTML document and it
is served directly from Cloudflare's edge — there is no Worker script, no build
step and no framework.

## URLs

| Path | Serves |
| --- | --- |
| `/` | Class homepage listing all 27 students |
| `/student/<STUDENT_ID>/` | That student's page |
| anything else | `public/404.html` with a 404 status |

`/student/B26FA1091` (no trailing slash) redirects to `/student/B26FA1091/`.

## Layout

```
public/                                  <- everything in here is published
├── index.html                           <- class homepage
├── 404.html                             <- not-found page
└── student/
    ├── B26FA1091/index.html
    ├── B26FA1891/index.html
    └── ...                              <- 27 folders, one per student
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

```bash
npx wrangler login # once
npm run deploy
```

This publishes to `eaib101.<your-subdomain>.workers.dev`. Change `name` in
`wrangler.jsonc` to use a different Worker name, or attach a custom domain from
the Cloudflare dashboard.

## Adding a student

Create `public/student/<STUDENT_ID>/index.html`, then add a matching entry to the
list in `public/index.html` so they show up on the homepage.
