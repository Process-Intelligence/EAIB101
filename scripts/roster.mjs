// Loads and validates the roster (students.json) and the problem sets
// (problem-sets.json), and reads the submission state of every student page.
//
// Layout on disk:
//
//   public/ps/<SET_ID>/index.html          the problem set page
//   public/ps/<SET_ID>/<STUDENT_ID>/       that student's submission for it
//
// Student folders are flat inside a problem set, so student IDs must be unique
// across *all* groups — that is checked here and is a hard error.

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

  const seenStudent = new Map() // lower-cased id -> { id, group }
  const seenGroup = new Set()

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
      const first = seenStudent.get(s.id.toLowerCase())
      if (first) {
        problems.push(
          first.id === s.id
            ? `student id "${s.id}" appears twice (groups "${first.group}" and "${gid}") — ` +
                'IDs must be unique because every student has one folder per problem set'
            : `student ids "${first.id}" and "${s.id}" differ only by case — they would share one folder on macOS and Windows`
        )
      } else {
        seenStudent.set(s.id.toLowerCase(), { id: s.id, group: gid })
      }
      if (isText(s.name)) {
        const name = s.name.trim()
        if (namesInGroup.has(name)) {
          warnings.push(`students "${namesInGroup.get(name)}" and "${s.id}" in group "${gid}" have the same name "${name}"`)
        } else {
          namesInGroup.set(name, s.id)
        }
      }
    }
  }

  if (problems.length) {
    throw new Error('scripts/students.json is invalid:\n  - ' + problems.join('\n  - '))
  }

  return {
    class: raw.class ?? 'EAIB101',
    warnings,
    groups: raw.groups.map((group) => ({
      id: group.id,
      label: group.label.trim(),
      students: group.students.map(({ id, name }) => ({ id, name: name.trim(), group: group.id })),
    })),
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
    if (set.status === 'published') {
      if (!isText(set.title)) problems.push(`${where} is published but has no title`)
      if (!isText(set.task)) problems.push(`${where} is published but has no task`)
    }
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
  const text = html.trim()
  if (text.length < 200 || !/<(!doctype|html|head|body)\b/i.test(text)) {
    const why = text.length === 0 ? 'file is empty' : 'not an HTML document (no doctype, <html>, <head> or <body>)'
    return { state: 'broken', exists: true, submitted: false, notes: [why] }
  }
  return { state: 'submitted', exists: true, submitted: true, notes: lintSubmission(html) }
}

// Attaches per-student submission state for one problem set and counts it up.
// `issues` lists every page that needs the maintainer's eye: missing, legacy
// or broken files, and submitted pages with lint notes.
export function groupsFor(set, roster) {
  const issues = []
  const groups = roster.groups.map((group) => {
    const students = group.students.map((s) => {
      const st = submissionState(set.id, s.id)
      if ((st.state !== 'submitted' && st.state !== 'placeholder') || st.notes.length) {
        issues.push({ id: s.id, state: st.state, notes: st.notes })
      }
      return { ...s, ...st }
    })
    const done = students.filter((s) => s.submitted).length
    return { ...group, students, done, total: students.length, pct: pct(done, students.length) }
  })
  const done = groups.reduce((n, g) => n + g.done, 0)
  const total = groups.reduce((n, g) => n + g.total, 0)
  return { groups, done, total, pct: pct(done, total), issues }
}

export const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0)

// What sits inside a problem set's folder besides its own index.html:
// `orphans` are student folders no group claims (a typo or a removed student),
// `strays` are loose files. Both are served, but nothing links to them.
export function inspectSetDir(setId, roster) {
  const dir = setDir(setId)
  if (!existsSync(dir)) return { orphans: [], strays: [] }
  const known = new Set(roster.groups.flatMap((g) => g.students.map((s) => s.id)))
  const entries = readdirSync(dir, { withFileTypes: true })
  return {
    orphans: entries.filter((e) => e.isDirectory() && !known.has(e.name)).map((e) => e.name),
    strays: entries.filter((e) => !e.isDirectory() && e.name !== 'index.html').map((e) => e.name),
  }
}
export const findOrphanFolders = (setId, roster) => inspectSetDir(setId, roster).orphans

// The files in a student's folder, or null when the folder does not exist.
export function studentFolderFiles(setId, studentId) {
  const dir = studentDir(setId, studentId)
  return existsSync(dir) ? readdirSync(dir) : null
}
