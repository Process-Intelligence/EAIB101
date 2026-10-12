// Loads and validates the roster (students.json) and the problem sets
// (problem-sets.json), and reads the submission state of every student page.
//
// Layout on disk:
//
//   public/ps/<SET_ID>/index.html          the problem set page
//   public/ps/<SET_ID>/<STUDENT_ID>/       that student's submission for it
//   public/ps/<SET_ID>/<TEAM_ID>/          a team's, for a set handed in by team
//
// Student and team folders are flat inside a problem set, so their IDs must be
// unique across *all* groups — that is checked here and is a hard error.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const PUBLIC_DIR = join(ROOT, 'public')
export const PS_DIR = join(PUBLIC_DIR, 'ps')

// Machine marker written into every generated placeholder page. A student page
// that still carries it has not been submitted yet. It is an HTML comment no
// student would type, so a real submission can never be mistaken for a
// placeholder because of its wording.
export const PLACEHOLDER_MARKER = '<!-- eaib101:placeholder -->'

// The sentence the placeholder shows. Placeholders generated before the
// comment marker existed are recognised by it (together with the rest of the
// old template) so `npm run scaffold -- --refresh` can rewrite them, and the
// build warns when it meets one.
export const PLACEHOLDER_SENTENCE = 'Түр зуурын хуудас'
const LEGACY_SIGNATURE = [PLACEHOLDER_SENTENCE, 'хараахан илгээгээгүй байна', '<code class="path">public/ps/']
export const isLegacyPlaceholder = (html) => LEGACY_SIGNATURE.every((s) => html.includes(s))

const ID_RE = /^[A-Za-z0-9_-]+$/
const isText = (v) => typeof v === 'string' && v.trim().length > 0

// Escapes text for an HTML text node or a double-quoted attribute. A missing
// value is a bug in the caller — validation should have refused the input —
// so it throws rather than printing the word "undefined" on a page.
export const esc = (s) => {
  if (s === undefined || s === null) {
    throw new Error('esc(): a required value is missing — it slipped past validation')
  }
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// JSON for an inline <script>: "<" is escaped so no value can close the tag.
export const jsonForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

export const setDir = (setId) => join(PS_DIR, setId)
export const studentDir = (setId, studentId) => join(PS_DIR, setId, studentId)
export const setUrl = (setId) => `/ps/${setId}/`
export const studentUrl = (setId, studentId) => `/ps/${setId}/${studentId}/`

// Reads one of the JSON config files, naming the file in any error.
function readJson(name) {
  const path = join(ROOT, 'scripts', name)
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch (e) {
    throw new Error(`scripts/${name}: ${e.message}`)
  }
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`scripts/${name} is not valid JSON: ${e.message}`)
  }
}

// --- roster ---------------------------------------------------------------

export function loadRoster() {
  const raw = readJson('students.json')
  const problems = []
  const warnings = []

  if (!Array.isArray(raw.groups) || raw.groups.length === 0) {
    throw new Error('scripts/students.json: "groups" must be a non-empty array')
  }

  const seenId = new Map() // lower-cased student or team id -> { id, group, kind }
  const seenGroup = new Set()

  // Students and teams share one folder namespace inside a problem set, so
  // every id is checked against both.
  const claim = (id, gid, kind) => {
    const first = seenId.get(id.toLowerCase())
    if (!first) {
      seenId.set(id.toLowerCase(), { id, group: gid, kind })
      return
    }
    problems.push(
      first.id !== id
        ? `ids "${first.id}" and "${id}" differ only by case — they would share one folder on macOS and Windows`
        : first.kind === kind
          ? `${kind} id "${id}" appears twice (groups "${first.group}" and "${gid}") — ` +
            `IDs must be unique because every ${kind} has one folder per problem set`
          : `"${id}" is both a ${first.kind} id and a ${kind} id — they would share one folder per problem set`
    )
  }

  for (const group of raw.groups) {
    const gid = group.id
    if (!isText(gid) || !ID_RE.test(gid)) {
      problems.push(`group id ${JSON.stringify(gid)} is missing or not URL-safe (letters, digits, _ and - only)`)
    }
    if (seenGroup.has(gid)) problems.push(`duplicate group id "${gid}"`)
    seenGroup.add(gid)
    if (!isText(group.label)) problems.push(`group "${gid}" has no label`)
    if (!Array.isArray(group.students)) {
      problems.push(`group "${gid}" has no students array`)
      continue
    }
    if (group.students.length === 0) problems.push(`group "${gid}" has no students`)

    const namesInGroup = new Map()
    for (const s of group.students) {
      if (!isText(s.id) || !ID_RE.test(s.id)) {
        problems.push(`student id ${JSON.stringify(s.id)} is missing or not URL-safe (letters, digits, _ and - only)`)
        continue
      }
      if (!isText(s.name)) problems.push(`student "${s.id}" has no name`)
      claim(s.id, gid, 'student')
      if (isText(s.name)) {
        const name = s.name.trim()
        if (namesInGroup.has(name)) {
          warnings.push(`students "${namesInGroup.get(name)}" and "${s.id}" in group "${gid}" have the same name "${name}"`)
        } else {
          namesInGroup.set(name, s.id)
        }
      }
    }

    // Teams are optional. Each lists its members by student id; a student is
    // on at most one team, and only on a team in their own group.
    if (group.teams === undefined) continue
    if (!Array.isArray(group.teams)) {
      problems.push(`group "${gid}": "teams" must be an array`)
      continue
    }
    const inGroup = new Set(group.students.map((s) => s.id))
    const onTeam = new Map() // student id -> team id
    for (const t of group.teams) {
      if (!isText(t.id) || !ID_RE.test(t.id)) {
        problems.push(`team id ${JSON.stringify(t.id)} in group "${gid}" is missing or not URL-safe (letters, digits, _ and - only)`)
        continue
      }
      claim(t.id, gid, 'team')
      if (!isText(t.name)) problems.push(`team "${t.id}" has no name`)
      if (!Array.isArray(t.members) || t.members.length === 0) {
        problems.push(`team "${t.id}" has no members`)
        continue
      }
      for (const m of t.members) {
        if (!inGroup.has(m)) problems.push(`team "${t.id}" lists ${JSON.stringify(m)}, who is not a student in group "${gid}"`)
        else if (onTeam.has(m)) problems.push(`student "${m}" is on two teams, "${onTeam.get(m)}" and "${t.id}"`)
        else onTeam.set(m, t.id)
      }
    }
    const loose = group.students.filter((s) => !onTeam.has(s.id))
    if (group.teams.length && loose.length) {
      warnings.push(
        `group "${gid}": ${loose.length} student(s) on no team — ${loose.map((s) => s.id).join(', ')}; ` +
          'they have nothing to hand in for a team problem set'
      )
    }
  }

  if (problems.length) {
    throw new Error('scripts/students.json is invalid:\n  - ' + problems.join('\n  - '))
  }

  return {
    class: raw.class ?? 'EAIB101',
    warnings,
    groups: raw.groups.map((group) => {
      const students = group.students.map(({ id, name }) => ({ id, name: name.trim(), group: group.id }))
      const byId = new Map(students.map((s) => [s.id, s]))
      const teams = (group.teams ?? []).map((t) => ({
        id: t.id,
        name: t.name.trim(),
        group: group.id,
        members: t.members.map((m) => byId.get(m)),
      }))
      const teamed = new Set(teams.flatMap((t) => t.members.map((m) => m.id)))
      return {
        id: group.id,
        label: group.label.trim(),
        students,
        teams,
        // Students on no team: a team problem set has no page for them.
        unassigned: teams.length ? students.filter((s) => !teamed.has(s.id)) : [],
      }
    }),
  }
}

// --- problem sets ---------------------------------------------------------

export function loadProblemSets() {
  const raw = readJson('problem-sets.json')
  const problems = []

  if (!Array.isArray(raw.sets) || raw.sets.length === 0) {
    throw new Error('scripts/problem-sets.json: "sets" must be a non-empty array')
  }

  const seen = new Set()
  for (const set of raw.sets) {
    if (!isText(set.id) || !ID_RE.test(set.id)) {
      problems.push(`problem set id ${JSON.stringify(set.id)} is missing or not URL-safe`)
      continue
    }
    const where = `problem set "${set.id}"`
    if (seen.has(set.id)) problems.push(`duplicate ${where}`)
    seen.add(set.id)
    if (!['published', 'planned'].includes(set.status)) {
      problems.push(`${where} has status ${JSON.stringify(set.status)} — expected "published" or "planned"`)
    }
    for (const field of ['title', 'tagline', 'session', 'flow', 'task']) {
      if (set[field] !== undefined && typeof set[field] !== 'string') problems.push(`${where}: "${field}" must be a string`)
    }
    if (set.sources !== undefined && !(Array.isArray(set.sources) && set.sources.every(isText))) {
      problems.push(`${where}: "sources" must be an array of strings`)
    }
    if (set.submission !== undefined && !['individual', 'team'].includes(set.submission)) {
      problems.push(`${where} has submission ${JSON.stringify(set.submission)} — expected "individual" or "team"`)
    }
    // A published set may open before its brief is written: its page then
    // shows "Бодлого <id>" as the title and says the task is still to come.
    if (set.steps !== undefined && !Array.isArray(set.steps)) {
      problems.push(`${where}: "steps" must be an array`)
      continue
    }
    for (const [i, step] of (set.steps ?? []).entries()) {
      const at = `${where}, step ${i + 1}`
      if (!isText(step.n)) problems.push(`${at} has no "n" (e.g. "Step 1")`)
      if (!isText(step.title)) problems.push(`${at} has no title`)
      for (const field of ['lead', 'intro']) {
        if (step[field] !== undefined && typeof step[field] !== 'string') problems.push(`${at}: "${field}" must be a string`)
      }
      if (step.blocks !== undefined && !Array.isArray(step.blocks)) {
        problems.push(`${at}: "blocks" must be an array`)
        continue
      }
      for (const [j, block] of (step.blocks ?? []).entries()) {
        const b = `${at}, block ${j + 1}`
        if (!['list', 'code', 'note'].includes(block.type)) {
          problems.push(`${b}: unknown block type ${JSON.stringify(block.type)}`)
          continue
        }
        if (block.title !== undefined && typeof block.title !== 'string') problems.push(`${b}: "title" must be a string`)
        if (block.type === 'list' && !(Array.isArray(block.items) && block.items.length > 0 && block.items.every(isText))) {
          problems.push(`${b}: a list block needs a non-empty "items" array of strings`)
        }
        if (block.type !== 'list' && !isText(block.text)) problems.push(`${b}: a ${block.type} block needs "text"`)
      }
    }
  }

  if (problems.length) {
    throw new Error('scripts/problem-sets.json is invalid:\n  - ' + problems.join('\n  - '))
  }

  return { class: raw.class ?? 'EAIB101', course: raw.course ?? '', sets: raw.sets }
}

// --- submission state -----------------------------------------------------

// Things worth a look on a submitted page. They never change the count; the
// build prints them so the maintainer knows which pages depend on the network.
export function lintSubmission(html) {
  const notes = []
  const urls = [
    ...[...html.matchAll(/<(?:script|link|img|iframe|video|audio|source)\b[^>]*?\b(?:src|href)\s*=\s*["']?(https?:\/\/[^"'\s>]+)/gi)].map((m) => m[1]),
    ...[...html.matchAll(/(?:@import\s+(?:url\()?|url\()\s*["']?(https?:\/\/[^"')\s]+)/gi)].map((m) => m[1]),
  ]
  const hosts = [...new Set(urls.map((u) => u.replace(/^https?:\/\//, '').split('/')[0]))]
  if (hosts.length) notes.push(`loads assets from ${hosts.join(', ')} — will not work without internet`)
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) notes.push('no viewport meta tag — may render zoomed out on phones')
  if (!/^\s*<!doctype/i.test(html)) notes.push('does not start with <!doctype html>')
  return notes
}

// The state of one student's page for one problem set:
//
//   missing      no index.html (run npm run scaffold)
//   placeholder  the generated page — not submitted
//   legacy       a placeholder from before the machine marker — not submitted;
//                rewrite it with `npm run scaffold -- --refresh`
//   broken       a file that is empty or not an HTML document — counted as
//                pending and reported, so an upload that went wrong is noticed
//   submitted    anything else
export function submissionState(setId, studentId) {
  const page = join(studentDir(setId, studentId), 'index.html')
  if (!existsSync(page)) return { state: 'missing', exists: false, submitted: false, notes: [] }
  if (!statSync(page).isFile()) return { state: 'broken', exists: true, submitted: false, notes: ['index.html is not a file'] }
  const html = readFileSync(page, 'utf8')
  if (html.includes(PLACEHOLDER_MARKER)) return { state: 'placeholder', exists: true, submitted: false, notes: [] }
  if (isLegacyPlaceholder(html)) return { state: 'legacy', exists: true, submitted: false, notes: [] }
  return judge(html)
}

// The state of one team's work for one problem set. The team's index.html is
// generated by the build — the members, then the work — so the work itself is
// the file beside it, TEAM_WORK, and there is no placeholder to tell apart:
//
//   pending      no work.html yet
//   broken       as for a student page
//   submitted    anything else
export function teamWorkState(setId, teamId) {
  const file = join(studentDir(setId, teamId), TEAM_WORK)
  if (!existsSync(file)) return { state: 'pending', exists: false, submitted: false, notes: [] }
  if (!statSync(file).isFile()) return { state: 'broken', exists: true, submitted: false, notes: [`${TEAM_WORK} is not a file`] }
  return judge(readFileSync(file, 'utf8'))
}

// Broken when a handed-in file is empty or not an HTML document, submitted
// otherwise.
function judge(html) {
  const text = html.trim()
  if (text.length < 200 || !/<(!doctype|html|head|body)\b/i.test(text)) {
    const why = text.length === 0 ? 'file is empty' : 'not an HTML document (no doctype, <html>, <head> or <body>)'
    return { state: 'broken', exists: true, submitted: false, notes: [why] }
  }
  return { state: 'submitted', exists: true, submitted: true, notes: lintSubmission(html) }
}

// --- who hands in work ----------------------------------------------------
//
// A set with "submission": "team" is handed in once per team by every group
// that has teams. A group without teams still hands it in student by student.

export const TEAM_WORK = 'work.html'

// Marker in every generated team page, so the build never overwrites a team's
// work that was dropped in as index.html by mistake.
export const TEAM_MARKER = '<!-- eaib101:team-page -->'

export const byTeam = (set, group) => set.submission === 'team' && group.teams.length > 0
export const entriesFor = (set, group) => (byTeam(set, group) ? group.teams : group.students)

// Attaches the submission state of every student or team for one problem set
// and counts it up. `issues` lists everything that needs the maintainer's eye:
// missing, legacy or broken files, and submitted pages with lint notes.
export function groupsFor(set, roster) {
  const issues = []
  const groups = roster.groups.map((group) => {
    const team = byTeam(set, group)
    const entries = entriesFor(set, group).map((e) => {
      const st = team ? teamWorkState(set.id, e.id) : submissionState(set.id, e.id)
      if (!['submitted', 'placeholder', 'pending'].includes(st.state) || st.notes.length) {
        issues.push({ id: team ? `${e.id}/${TEAM_WORK}` : e.id, state: st.state, notes: st.notes })
      }
      return { ...e, ...st }
    })
    const done = entries.filter((e) => e.submitted).length
    return { ...group, byTeam: team, entries, done, total: entries.length, pct: pct(done, entries.length) }
  })
  const done = groups.reduce((n, g) => n + g.done, 0)
  const total = groups.reduce((n, g) => n + g.total, 0)
  return { groups, done, total, pct: pct(done, total), issues }
}

export const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0)

// What sits inside a problem set's folder besides its own index.html:
// `orphans` are folders that are not a student or team of this set (a typo, a
// removed student, a student folder in a set handed in by team), `strays` are
// loose files. Both are served, but nothing links to them.
export function inspectSetDir(set, roster) {
  const dir = setDir(set.id)
  if (!existsSync(dir)) return { orphans: [], strays: [] }
  const known = new Set(roster.groups.flatMap((g) => entriesFor(set, g).map((e) => e.id)))
  const entries = readdirSync(dir, { withFileTypes: true })
  return {
    orphans: entries.filter((e) => e.isDirectory() && !known.has(e.name)).map((e) => e.name),
    strays: entries.filter((e) => !e.isDirectory() && e.name !== 'index.html').map((e) => e.name),
  }
}
export const findOrphanFolders = (set, roster) => inspectSetDir(set, roster).orphans

// The files in a student's folder, or null when the folder does not exist.
export function studentFolderFiles(setId, studentId) {
  const dir = studentDir(setId, studentId)
  return existsSync(dir) ? readdirSync(dir) : null
}
