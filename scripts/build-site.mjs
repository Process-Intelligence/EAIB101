// Regenerates every page the site owns:
//
//   public/assets/site.css      the shared stylesheet
//   public/index.html           course overview
//   public/ps/<SET_ID>/index.html   one page per problem set
//
//   npm run index
//
// Student submissions under public/ps/<SET_ID>/<STUDENT_ID>/ are never written
// here — they are read only, to count who has submitted.

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  loadRoster,
  loadProblemSets,
  groupsFor,
  findOrphanFolders,
  setDir,
  setUrl,
  studentUrl,
  esc,
  pct,
  PUBLIC_DIR,
} from './roster.mjs'
import { css, page, sidebar, STYLESHEET } from './layout.mjs'

const roster = loadRoster()
const { class: CLASS, course: COURSE, sets: rawSets } = loadProblemSets()

// Attach per-set submission counts once; the sidebar and the overview share them.
const sets = rawSets.map((set) => {
  const state = set.status === 'published' ? groupsFor(set, roster) : { groups: [], done: 0, total: 0, pct: 0 }
  return { ...set, ...state }
})

// --- warnings -------------------------------------------------------------
for (const set of sets) {
  if (set.status !== 'published') continue
  for (const group of set.groups) {
    for (const s of group.students) {
      if (!s.exists) {
        console.warn(`  ! ps/${set.id}/${s.id}: no index.html — counting as pending (run npm run scaffold)`)
      }
    }
  }
  for (const orphan of findOrphanFolders(set.id, roster)) {
    console.warn(`  ! public/ps/${set.id}/${orphan}/ is not on any roster — nothing links to it`)
  }
}

const STATUS = { published: 'Нээлттэй', planned: 'Нээгээгүй' }
const nav = (current) => sidebar({ className: CLASS, course: COURSE, sets, current })

// --- shared fragments -----------------------------------------------------

function progress(done, total, label) {
  return `      <div class="progress">
        <div class="progress-head">
          <span><b>${done}</b> / ${total} илгээсэн</span>
          <span class="pct">${pct(done, total)}%</span>
        </div>
        <div class="bar" role="img" aria-label="${esc(label)}: ${done} of ${total} students have submitted">
          <span style="width: ${pct(done, total)}%"></span>
        </div>
      </div>`
}

function studentCard(student, set) {
  // A planned problem set has no student pages to link to, so the card is
  // rendered as plain text rather than a dead link.
  if (set.status !== 'published') {
    return `          <li>
            <div class="student is-locked">
              <span class="row">
                <span class="code mono">${esc(student.id)}</span>
                <span class="tag">${STATUS.planned}</span>
              </span>
              <span class="name">${esc(student.name)}</span>
            </div>
          </li>`
  }
  const state = student.submitted ? 'is-submitted' : 'is-pending'
  const tag = student.submitted ? 'Илгээсэн' : 'Хүлээгдэж буй'
  return `          <li>
            <a class="student ${state}" href="${esc(studentUrl(set.id, student.id))}">
              <span class="row">
                <span class="code mono">${esc(student.id)}</span>
                <span class="tag">${tag}</span>
              </span>
              <span class="name">${esc(student.name)}</span>
            </a>
          </li>`
}

// The two group tabs plus their student grids, for one problem set. Pure CSS:
// a visually hidden radio per group drives both the pill and the panel, so the
// tabs work with JavaScript disabled.
function groupTabs(set, groups) {
  const tabId = (g) => `tab-${g.id}`
  const panelId = (g) => `panel-${g.id}`

  const inputs = groups
    .map(
      (g, i) =>
        `      <input class="tabinput" type="radio" name="group" id="${esc(tabId(g))}" autocomplete="off"${
          i === 0 ? ' checked' : ''
        }>`
    )
    .join('\n')

  const tabs = groups
    .map(
      (g) => `        <label class="tab" for="${esc(tabId(g))}">
          <span class="tab-name">${esc(g.label)}</span>
          <span class="tab-count mono">${set.status === 'published' ? `${g.done}/${g.total}` : g.total}</span>
        </label>`
    )
    .join('\n')

  const panels = groups
    .map(
      (g) => `      <section class="panel" id="${esc(panelId(g))}" aria-label="${esc(g.label)}">
${set.status === 'published' ? progress(g.done, g.total, g.label) + '\n' : ''}        <ul class="grid">
${g.students.map((s) => studentCard(s, set)).join('\n')}
        </ul>
      </section>`
    )
    .join('\n\n')

  const rules = groups
    .map(
      (g) => `  #${tabId(g)}:checked ~ #${panelId(g)} { display: block; }
  #${tabId(g)}:checked ~ .tabs .tab[for="${tabId(g)}"] {
    background: var(--accent-soft); border-color: var(--accent); color: var(--ink);
  }
  #${tabId(g)}:checked ~ .tabs .tab[for="${tabId(g)}"] .tab-count { background: var(--panel); }
  #${tabId(g)}:focus-visible ~ .tabs .tab[for="${tabId(g)}"] {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }`
    )
    .join('\n')

  return { html: `${inputs}\n\n      <div class="tabs">\n${tabs}\n      </div>\n\n${panels}`, rules }
}

const tabScript = (groups) => `<script>
// Deep links: #<group-id> opens that tab and switching tabs updates the URL, so
// a tab can be shared. Without JS the tabs still work — this only syncs the
// address bar.
(function () {
  var groups = ${JSON.stringify(groups.map((g) => g.id))};
  var wanted = decodeURIComponent(location.hash.slice(1));
  groups.forEach(function (id) {
    var input = document.getElementById('tab-' + id);
    if (!input) return;
    if (id === wanted) input.checked = true;
    input.addEventListener('change', function () {
      if (input.checked) history.replaceState(null, '', '#' + id);
    });
  });
})();
</script>`

// --- problem set guidance -------------------------------------------------

function block(b) {
  if (b.type === 'note') return `        <div class="note"><p>${esc(b.text)}</p></div>`
  const title = b.title ? `          <p class="block-title">${esc(b.title)}</p>\n` : ''
  if (b.type === 'code') {
    return `        <div class="block">
${title}          <pre><code>${esc(b.text)}</code></pre>
        </div>`
  }
  return `        <div class="block">
${title}          <ul>
${b.items.map((i) => `            <li>${esc(i)}</li>`).join('\n')}
          </ul>
        </div>`
}

function step(s) {
  return `      <article class="step">
        <p class="step-n">${esc(s.n)}</p>
        <h3>${esc(s.title)}</h3>
${s.lead ? `        <p class="step-lead">${esc(s.lead)}</p>\n` : ''}${
    s.intro ? `        <p class="step-intro">${esc(s.intro)}</p>\n` : ''
  }${(s.blocks ?? []).map(block).join('\n')}
      </article>`
}

// --- problem set page -----------------------------------------------------

function problemSetPage(set) {
  const open = set.status === 'published'
  const heading = open ? set.title : `Бодлого ${set.id}`

  const brief = open
    ? `      <section class="sec brief">
        <h2>The task</h2>
        <div class="card">
          <p>${esc(set.task)}</p>
${
  set.sources?.length
    ? `          <h3>Where to look</h3>
          <div class="meta">
${set.sources.map((s) => `            <span class="chip">${esc(s)}</span>`).join('\n')}
          </div>`
    : ''
}
        </div>
      </section>

      <section class="sec">
        <h2>Алхмууд</h2>
        <div class="steps">
${(set.steps ?? []).map(step).join('\n')}
        </div>
      </section>`
    : `      <section class="sec">
        <h2>Танилцуулга</h2>
        <div class="card">
          <p>Энэ бодлого хараахан нээгдээгүй байна. Даалгаврын тайлбар нээгдэх үед энэ хэсэгт байрлана.</p>
        </div>
      </section>`

  // A planned set still shows both groups, so the roster is visible up front.
  const groups = open ? set.groups : roster.groups.map((g) => ({ ...g, done: 0, total: g.students.length }))
  const { html: tabsHtml, rules } = groupTabs(set, groups)

  const main = `      <header class="phead">
        <p class="eyebrow">Problem Set ${esc(set.id)}</p>
        <h1>${esc(heading)}</h1>
${set.tagline ? `        <p class="tagline">${esc(set.tagline)}</p>\n` : ''}        <div class="meta">
          <span class="chip${open ? ' is-open' : ''}">${STATUS[set.status]}</span>
${set.session ? `          <span class="chip">${esc(set.session)}</span>\n` : ''}${
    set.flow ? `          <span class="chip">${esc(set.flow)}</span>\n` : ''
  }        </div>
      </header>

${brief}

      <section class="sec">
        <h2>${open ? 'Илгээсэн ажлууд' : 'Оюутнууд'}</h2>
${open ? progress(set.done, set.total, `Бодлого ${set.id}`) + '\n' : ''}${tabsHtml}
      </section>

      <footer class="page"><a href="/">← Тойм</a></footer>`

  return page({
    title: `Бодлого ${set.id}${open ? ` — ${set.title}` : ''} | ${CLASS}`,
    description: open
      ? `${CLASS} — Бодлого ${set.id}: ${set.title}. ${set.done}/${set.total} илгээсэн.`
      : `${CLASS} — Бодлого ${set.id} хараахан нээгдээгүй байна.`,
    side: nav(set.id),
    main: `      <div class="wrap">\n${main}\n      </div>`,
    script: `<style>\n${rules}\n</style>\n${tabScript(groups)}`,
  })
}

// --- overview page --------------------------------------------------------

function overviewPage() {
  const openSets = sets.filter((s) => s.status === 'published')
  const done = openSets.reduce((n, s) => n + s.done, 0)
  const total = openSets.reduce((n, s) => n + s.total, 0)
  const students = roster.groups.reduce((n, g) => n + g.students.length, 0)

  const cards = sets
    .map((s) => {
      const open = s.status === 'published'
      const inner = `          <span class="row">
            <span class="num mono">${esc(s.id)}</span>
            <span class="tag">${open ? `${s.done}/${s.total}` : STATUS.planned}</span>
          </span>
          <span class="title${s.title ? '' : ' is-empty'}">${esc(s.title || 'Удахгүй')}</span>
${open ? `          <span class="bar" role="img" aria-label="${s.done} of ${s.total} submitted"><span style="width: ${s.pct}%"></span></span>` : ''}`
      return open
        ? `        <li><a class="pscard is-open" href="${esc(setUrl(s.id))}">\n${inner}\n        </a></li>`
        : `        <li><div class="pscard is-planned">\n${inner}\n        </div></li>`
    })
    .join('\n')

  const groupRows = roster.groups
    .map(
      (g) => `          <li>
            <div class="student">
              <span class="row">
                <span class="code mono">${g.students.length} оюутан</span>
              </span>
              <span class="name">${esc(g.label)}</span>
            </div>
          </li>`
    )
    .join('\n')

  const main = `      <header class="phead">
        <p class="eyebrow">${esc(COURSE)}</p>
        <h1>${esc(CLASS)}</h1>
        <p class="lede">${sets.length} бодлого · ${roster.groups.length} хөтөлбөр · ${students} оюутан</p>
      </header>

      <section class="sec">
        <h2>Нийт илгээсэн байдал</h2>
${progress(done, total, 'Нийт')}
      </section>

      <section class="sec">
        <h2>Бодлогууд</h2>
        <ul class="pscards">
${cards}
        </ul>
      </section>

      <section class="sec">
        <h2>Хөтөлбөрүүд</h2>
        <ul class="grid">
${groupRows}
        </ul>
      </section>

      <footer class="page">Бодлого сонгож, оюутны хуудсыг нээнэ үү. Хүлээгдэж буй хуудсууд түр зуурын байна.</footer>`

  return page({
    title: `${CLASS} — Оюутны ажлууд`,
    description: `${CLASS} (${COURSE}) — ${sets.length} бодлого, ${students} оюутан. ${done}/${total} илгээсэн.`,
    side: nav('home'),
    main: `      <div class="wrap">\n${main}\n      </div>`,
  })
}

// --- write ----------------------------------------------------------------

mkdirSync(join(PUBLIC_DIR, 'assets'), { recursive: true })
writeFileSync(join(PUBLIC_DIR, 'assets', 'site.css'), css, 'utf8')

writeFileSync(join(PUBLIC_DIR, 'index.html'), overviewPage(), 'utf8')

for (const set of sets) {
  mkdirSync(setDir(set.id), { recursive: true })
  writeFileSync(join(setDir(set.id), 'index.html'), problemSetPage(set), 'utf8')
}

const openSets = sets.filter((s) => s.status === 'published')
console.log(`${STYLESHEET} + ${sets.length + 1} page(s) regenerated`)
for (const s of openSets) {
  console.log(`  ps/${s.id} ${s.title}: ${s.done}/${s.total} (${s.pct}%)`)
  for (const g of s.groups) console.log(`    ${g.label}: ${g.done}/${g.total}`)
}
console.log(`  ${sets.length - openSets.length} planned problem set(s) rendered as placeholders`)
