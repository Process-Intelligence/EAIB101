// Regenerates every page the site owns:
//
//   public/assets/site.css          the shared stylesheet
//   public/index.html               course overview
//   public/ps/<SET_ID>/index.html   one page per problem set
//   public/404.html                 the not-found page
//
//   npm run index     write them
//   npm run check     write nothing; exit 1 if any of them is out of date
//
// Student submissions under public/ps/<SET_ID>/<STUDENT_ID>/ are never written
// here — they are read only, to count who has submitted.

import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import {
  loadRoster,
  loadProblemSets,
  groupsFor,
  inspectSetDir,
  setDir,
  setUrl,
  studentUrl,
  esc,
  jsonForScript,
  pct,
  PUBLIC_DIR,
  ROOT,
} from './roster.mjs'
import { css, tabRules, page, sidebar, langAttr, notFoundPage, STYLESHEET } from './layout.mjs'

const CHECK = process.argv.includes('--check')
const STATUS = { published: 'Нээлттэй', planned: 'Нээгээгүй' }

// Section ids are prefixed so they can never collide with a group id (which
// owns the bare "#<group id>" deep link) or the "tab-"/"panel-" ids.
const SEC = { task: 'sec-task', steps: 'sec-steps', roster: 'sec-roster', intro: 'sec-intro' }

let roster, sets, CLASS, COURSE, stylesheet

function main() {
  roster = loadRoster()
  const loaded = loadProblemSets()
  CLASS = loaded.class
  COURSE = loaded.course

  // Attach per-set submission counts once; the sidebar and the overview share them.
  sets = loaded.sets.map((set) => {
    const state = set.status === 'published' ? groupsFor(set, roster) : { groups: [], done: 0, total: 0, pct: 0, issues: [] }
    return { ...set, ...state }
  })

  warn()

  // The stylesheet is linked with a hash of its content, so _headers can let
  // browsers cache it for good and a redesign still reaches everyone at once.
  const sheet = `${css}\n${tabRules(roster.groups)}\n`
  stylesheet = `${STYLESHEET}?v=${createHash('sha256').update(sheet).digest('hex').slice(0, 10)}`

  const outputs = [
    [join(PUBLIC_DIR, 'assets', 'site.css'), sheet],
    [join(PUBLIC_DIR, 'index.html'), overviewPage()],
    [join(PUBLIC_DIR, '404.html'), notFoundPage({ className: CLASS })],
    ...sets.map((set) => [join(setDir(set.id), 'index.html'), problemSetPage(set)]),
  ]

  if (CHECK) {
    const stale = outputs.filter(([path, html]) => !existsSync(path) || readFileSync(path, 'utf8') !== html)
    if (stale.length) {
      console.error(`check: ${stale.length} generated file(s) out of date — run npm run index and commit:`)
      for (const [path] of stale) console.error(`  ${relative(ROOT, path)}`)
      process.exitCode = 1
    } else {
      console.log(`check: all ${outputs.length} generated files are up to date`)
    }
    return
  }

  for (const [path, html] of outputs) {
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, html, 'utf8')
  }

  const openSets = sets.filter((s) => s.status === 'published')
  console.log(`${STYLESHEET} + ${outputs.length - 1} page(s) regenerated`)
  for (const s of openSets) {
    console.log(`  ps/${s.id} ${s.title}: ${s.done}/${s.total} (${s.pct}%)`)
    for (const g of s.groups) console.log(`    ${g.label}: ${g.done}/${g.total}`)
  }
  console.log(`  ${sets.length - openSets.length} planned problem set(s) rendered as placeholders`)
}

// --- warnings -------------------------------------------------------------

function warn() {
  for (const w of roster.warnings) console.warn(`  ! ${w}`)
  for (const set of sets) {
    const { orphans, strays } = inspectSetDir(set.id, roster)
    if (set.status !== 'published') {
      const dir = setDir(set.id)
      const folders = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).length : 0
      if (folders) {
        console.warn(`  ! ps/${set.id} is planned but has ${folders} student folder(s) — they are served but nothing links to them; was it published before?`)
      }
      continue
    }
    for (const i of set.issues) {
      const where = `ps/${set.id}/${i.id}`
      if (i.state === 'missing') console.warn(`  ! ${where}: no index.html — counting as pending (run npm run scaffold)`)
      else if (i.state === 'legacy') console.warn(`  ! ${where}: old placeholder — counting as pending (run npm run scaffold -- --refresh)`)
      else if (i.state === 'broken') console.warn(`  ! ${where}: ${i.notes.join('; ')} — counting as pending`)
      else for (const n of i.notes) console.warn(`  · ${where}: ${n}`)
    }
    for (const o of orphans) console.warn(`  ! public/ps/${set.id}/${o}/ is not on any roster — nothing links to it`)
    for (const f of strays) console.warn(`  ! public/ps/${set.id}/${f} is a stray file — published, but nothing links to it`)
  }
}

// --- shared fragments -----------------------------------------------------

const nav = (current) => sidebar({ className: CLASS, course: COURSE, sets, current })

// Numbered section heading: "01  The task". The numeral is decoration for the
// eye, so it is hidden from assistive tech and the heading reads as its title.
function sectionHeading(n, title, count = '') {
  return `        <h2><span class="sec-n" aria-hidden="true">${esc(n)}</span><span${langAttr(title)}>${esc(title)}</span>${
    count ? `<span class="sec-count">${esc(count)}</span>` : ''
  }</h2>`
}

// The bar is decoration: the text beside it states the same numbers.
function progress(done, total, hero = false) {
  return `      <div class="progress${hero ? ' is-hero' : ''}">
        <div class="progress-head">
          <span><b>${done}</b> / ${total} илгээсэн</span>
          <span class="pct">${pct(done, total)}%</span>
        </div>
        <div class="bar" aria-hidden="true"><span style="width: ${pct(done, total)}%"></span></div>
      </div>`
}

function studentRow(student, set) {
  // A planned problem set has no student pages to link to, so the row is
  // rendered as plain text rather than a dead link.
  if (set.status !== 'published') {
    return `          <li>
            <div class="student is-locked">
              <span class="code mono">${esc(student.id)}</span>
              <span class="name">${esc(student.name)}</span>
              <span class="tag">${STATUS.planned}</span>
            </div>
          </li>`
  }
  const state = student.submitted ? 'is-submitted' : 'is-pending'
  const tag = student.submitted ? 'Илгээсэн' : 'Хүлээгдэж буй'
  return `          <li>
            <a class="student ${state}" href="${esc(studentUrl(set.id, student.id))}">
              <span class="code mono">${esc(student.id)}</span>
              <span class="name">${esc(student.name)}</span>
              <span class="tag">${tag}</span>
            </a>
          </li>`
}

// The group tabs plus their rosters, for one problem set. Pure CSS: a visually
// hidden radio per group drives both the tab and the panel (the rules live in
// the stylesheet, see tabRules), so the tabs work with JavaScript disabled.
// The radios sit in a fieldset so assistive tech knows what the choice is for.
//
// Each tab label carries id="<group id>", so "#<group id>" scrolls the browser
// to the tab bar even without the script; with it, that tab is also selected.
function groupTabs(set, groups) {
  const inputs = groups
    .map(
      (g, i) =>
        `      <input class="tabinput" type="radio" name="group" id="tab-${esc(g.id)}" autocomplete="off"${i === 0 ? ' checked' : ''}>`
    )
    .join('\n')

  const tabs = groups
    .map(
      (g) => `        <label class="tab" id="${esc(g.id)}" for="tab-${esc(g.id)}">
          <span class="tab-name">${esc(g.label)}</span>
          <span class="tab-count mono">${set.status === 'published' ? `${g.done}/${g.total}` : g.total}</span>
        </label>`
    )
    .join('\n')

  const panels = groups
    .map(
      (g) => `      <section class="panel" id="panel-${esc(g.id)}" aria-label="${esc(g.label)}">
${set.status === 'published' ? progress(g.done, g.total) + '\n' : ''}        <ul class="roster">
${g.students.map((s) => studentRow(s, set)).join('\n')}
        </ul>
      </section>`
    )
    .join('\n\n')

  return `      <fieldset class="tabset">
        <legend class="vh">Хөтөлбөр</legend>
${inputs}

      <div class="tabs">
${tabs}
      </div>

${panels}
      </fieldset>`
}

const tabScript = (groups) => `<script>
// Deep links: #<group-id> opens that tab and switching tabs updates the URL, so
// a tab can be shared. Without JS the tabs still work and the hash still
// scrolls to the tab bar — this only selects the tab and syncs the address bar.
(function () {
  var groups = ${jsonForScript(groups.map((g) => g.id))};
  groups.forEach(function (id) {
    var input = document.getElementById('tab-' + id);
    if (!input) return;
    input.addEventListener('change', function () {
      if (input.checked) history.replaceState(null, '', '#' + id);
    });
  });
  function select() {
    var wanted;
    try { wanted = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
    var input = groups.indexOf(wanted) >= 0 && document.getElementById('tab-' + wanted);
    if (input) input.checked = true;
  }
  select();
  window.addEventListener('hashchange', select);
})();
</script>`

// --- problem set guidance -------------------------------------------------

function block(b) {
  if (b.type === 'note') return `        <div class="note"><p${langAttr(b.text)}>${esc(b.text)}</p></div>`
  const title = b.title ? `          <h4 class="block-title"${langAttr(b.title)}>${esc(b.title)}</h4>\n` : ''
  if (b.type === 'code') {
    return `        <div class="block">
${title}          <pre${langAttr(b.text)}><code>${esc(b.text)}</code></pre>
        </div>`
  }
  return `        <div class="block">
${title}          <ul>
${b.items.map((i) => `            <li${langAttr(i)}>${esc(i)}</li>`).join('\n')}
          </ul>
        </div>`
}

function step(s) {
  return `      <article class="step">
        <div class="step-head">
          <p class="eyebrow step-n"${langAttr(s.n)}>${esc(s.n)}</p>
          <h3${langAttr(s.title)}>${esc(s.title)}</h3>
${s.lead ? `          <p class="step-lead"${langAttr(s.lead)}>${esc(s.lead)}</p>\n` : ''}        </div>
        <div class="step-body">
${s.intro ? `        <p class="step-intro"${langAttr(s.intro)}>${esc(s.intro)}</p>\n` : ''}${(s.blocks ?? []).map(block).join('\n')}
        </div>
      </article>`
}

// The strip under an open problem set's header: the counts the instructor
// reads off a projector, each a link — the total to the roster section,
// each program to its tab (the tab labels answer to "#<group id>").
function ledger(set) {
  const tile = (href, label, done, total, p) => `          <li><a href="${href}">
            <span class="ledger-k">${label}</span>
            <span class="ledger-v"><b>${done}</b> / ${total}<span class="pct">${p}%</span></span>
          </a></li>`
  return `      <nav class="ledger" aria-label="Илгээсэн ажлын тоо">
        <ul>
${tile(`#${SEC.roster}`, 'Нийт илгээсэн', set.done, set.total, set.pct)}
${set.groups.map((g) => tile(`#${esc(g.id)}`, esc(g.label), g.done, g.total, g.pct)).join('\n')}
        </ul>
      </nav>`
}

// --- problem set page -----------------------------------------------------

// An open set puts the roster first — it is what people come to click — with
// the guidance below and a jump link between them. A planned set has nothing
// to click, so its introduction comes first.
function problemSetPage(set) {
  const open = set.status === 'published'
  const heading = open ? set.title : `Бодлого ${set.id}`
  const groups = open ? set.groups : roster.groups.map((g) => ({ ...g, done: 0, total: g.students.length }))
  const students = groups.reduce((n, g) => n + g.total, 0)

  const rosterSection = `      <section class="sec" id="${SEC.roster}">
${sectionHeading(open ? '01' : '02', open ? 'Илгээсэн ажлууд' : 'Оюутнууд', open ? `${set.done}/${set.total}` : `${students} оюутан`)}
${open ? `        <p class="jump"><a href="#${SEC.task}">Даалгавар ба алхмууд ↓</a></p>\n` : ''}${groupTabs(set, groups)}
      </section>`

  const guidance = open
    ? `      <section class="sec brief" id="${SEC.task}">
${sectionHeading('02', 'The task')}
        <div class="prose">
          <p${langAttr(set.task)}>${esc(set.task)}</p>
${
  set.sources?.length
    ? `          <h3 lang="en">Where to look</h3>
          <div class="meta">
${set.sources.map((s) => `            <span class="chip"${langAttr(s)}>${esc(s)}</span>`).join('\n')}
          </div>`
    : ''
}
        </div>
      </section>

      <section class="sec" id="${SEC.steps}">
${sectionHeading('03', 'Алхмууд')}
        <div class="steps">
${(set.steps ?? []).map(step).join('\n')}
        </div>
      </section>`
    : `      <section class="sec" id="${SEC.intro}">
${sectionHeading('01', 'Танилцуулга')}
        <div class="prose">
          <p>Энэ бодлого хараахан нээгдээгүй байна. Даалгаврын тайлбар нээгдэх үед энэ хэсэгт байрлана.</p>
        </div>
      </section>`

  const main = `      <header class="phead">
        <p class="eyebrow" lang="en">Problem Set ${esc(set.id)}</p>
        <h1${langAttr(heading)}>${esc(heading)}</h1>
${set.tagline ? `        <p class="tagline"${langAttr(set.tagline)}>${esc(set.tagline)}</p>\n` : ''}        <div class="meta">
          <span class="chip${open ? ' is-open' : ' is-shut'}">${STATUS[set.status]}</span>
${set.session ? `          <span class="chip"${langAttr(set.session)}>${esc(set.session)}</span>\n` : ''}${
    set.flow ? `          <span class="chip"${langAttr(set.flow)}>${esc(set.flow)}</span>\n` : ''
  }        </div>
${open ? ledger(set) : ''}      </header>

${open ? `${rosterSection}\n\n${guidance}` : `${guidance}\n\n${rosterSection}`}

      <footer class="page"><a href="/">← Тойм</a></footer>`

  return page({
    title: `Бодлого ${set.id}${open ? ` — ${set.title}` : ''} | ${CLASS}`,
    description: open
      ? `${CLASS} — Бодлого ${set.id}: ${set.title}. ${set.done}/${set.total} илгээсэн.`
      : `${CLASS} — Бодлого ${set.id} хараахан нээгдээгүй байна.`,
    side: nav(set.id),
    main: `      <div class="wrap">\n${main}\n      </div>`,
    script: tabScript(groups),
    stylesheet,
  })
}

// --- overview page --------------------------------------------------------

function overviewPage() {
  const openSets = sets.filter((s) => s.status === 'published')
  const latest = openSets[openSets.length - 1]
  const done = openSets.reduce((n, s) => n + s.done, 0)
  const total = openSets.reduce((n, s) => n + s.total, 0)
  const students = roster.groups.reduce((n, g) => n + g.students.length, 0)

  const rows = sets
    .map((s) => {
      const open = s.status === 'published'
      if (!open) {
        return `        <li><div class="setrow is-planned">
          <span class="num mono">${esc(s.id)}</span>
          <span class="title${s.title ? '' : ' is-empty'}"${s.title ? langAttr(s.title) : ''}>${esc(s.title || 'Удахгүй')}</span>
          <span class="state">${STATUS.planned}</span>
        </div></li>`
      }
      return `        <li><a class="setrow is-open" href="${esc(setUrl(s.id))}">
          <span class="num mono">${esc(s.id)}</span>
          <span class="title"${langAttr(s.title)}>${esc(s.title)}</span>
          <span class="gauge">
            <span class="bar" aria-hidden="true"><span style="width: ${s.pct}%"></span></span>
            <span class="count mono">${s.done}/${s.total}</span>
          </span>
        </a></li>`
    })
    .join('\n')

  // Each program links to its tab on the latest open set — the page a student
  // in that program actually wants. Its count is summed over every open set.
  const groupRows = roster.groups
    .map((g) => {
      const gDone = openSets.reduce((n, s) => n + (s.groups.find((x) => x.id === g.id)?.done ?? 0), 0)
      const gTotal = openSets.reduce((n, s) => n + (s.groups.find((x) => x.id === g.id)?.total ?? 0), 0)
      const inner = `            <span class="grouprow-name">${esc(g.label)}</span>
            <span class="grouprow-size">${g.students.length} оюутан</span>
${
  latest
    ? `            <span class="grouprow-count"><b>${gDone}</b> / ${gTotal} илгээсэн</span>
            <span class="bar" aria-hidden="true"><span style="width: ${pct(gDone, gTotal)}%"></span></span>`
    : ''
}`
      return latest
        ? `          <li><a class="grouprow" href="${esc(setUrl(latest.id))}#${esc(g.id)}">\n${inner}\n          </a></li>`
        : `          <li><div class="grouprow">\n${inner}\n          </div></li>`
    })
    .join('\n')

  const main = `      <header class="phead">
        <p class="eyebrow"${langAttr(COURSE)}>${esc(COURSE)}</p>
        <h1>${esc(CLASS)}</h1>
        <p class="lede">${sets.length} бодлого · ${roster.groups.length} хөтөлбөр · ${students} оюутан</p>
      </header>

      <section class="sec">
${sectionHeading('01', 'Нийт илгээсэн байдал')}
${progress(done, total, true)}
      </section>

      <section class="sec">
${sectionHeading('02', 'Бодлогууд', `${openSets.length}/${sets.length} нээлттэй`)}
        <ol class="setlist">
${rows}
        </ol>
      </section>

      <section class="sec">
${sectionHeading('03', 'Хөтөлбөрүүд')}
        <ul class="grouplist">
${groupRows}
        </ul>
      </section>

      <footer class="page">Бодлого сонгож, оюутны хуудсыг нээнэ үү. Хүлээгдэж буй хуудсууд түр зуурын байна.</footer>`

  return page({
    title: `${CLASS} — Оюутны ажлууд`,
    description: `${CLASS} (${COURSE}) — ${sets.length} бодлого, ${students} оюутан. ${done}/${total} илгээсэн.`,
    side: nav('home'),
    main: `      <div class="wrap">\n${main}\n      </div>`,
    stylesheet,
  })
}

// --- run ------------------------------------------------------------------
// Last, after every function and constant above exists.

try {
  main()
} catch (e) {
  console.error(e.message)
  process.exitCode = 1
}
