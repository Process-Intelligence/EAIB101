// Loads and validates the roster (students.json) and the problem sets
// (problem-sets.json).
//
// Layout on disk:
//
//   public/ps/<SET_ID>/index.html          the problem set page
//   public/ps/<SET_ID>/<STUDENT_ID>/       that student's submission for it
//
// Student folders are flat inside a problem set, so student IDs must be unique
// across *all* groups — that is checked here and is a hard error.

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const PUBLIC_DIR = join(ROOT, 'public')
export const PS_DIR = join(PUBLIC_DIR, 'ps')

// Text unique to the generated placeholder page. A student page still
// containing it has not been submitted yet.
export const PLACEHOLDER_MARKER = 'Түр зуурын хуудас'

const ID_RE = /^[A-Za-z0-9_-]+$/

export const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export const setDir = (setId) => join(PS_DIR, setId)
export const studentDir = (setId, studentId) => join(PS_DIR, setId, studentId)
export const setUrl = (setId) => `/ps/${setId}/`
export const studentUrl = (setId, studentId) => `/ps/${setId}/${studentId}/`

// --- roster ---------------------------------------------------------------

export function loadRoster() {
  const raw = JSON.parse(readFileSync(join(ROOT, 'scripts', 'students.json'), 'utf8'))
  const problems = []

  if (!Array.isArray(raw.groups) || raw.groups.length === 0) {
    throw new Error('students.json: "groups" must be a non-empty array')
  }

  const seenStudent = new Map()
  const seenGroup = new Set()

  for (const group of raw.groups) {
    if (!group.id || !ID_RE.test(group.id)) {
      problems.push(`group id ${JSON.stringify(group.id)} is missing or not URL-safe`)
    }
    if (seenGroup.has(group.id)) problems.push(`duplicate group id "${group.id}"`)
    seenGroup.add(group.id)
    if (!group.label) problems.push(`group "${group.id}" has no label`)
    if (!Array.isArray(group.students)) {
      problems.push(`group "${group.id}" has no students array`)
      continue
    }
    for (const s of group.students) {
      if (!s.id || !ID_RE.test(s.id)) {
        problems.push(`student id ${JSON.stringify(s.id)} is missing or not URL-safe`)
        continue
      }
      if (!s.name) problems.push(`student "${s.id}" has no name`)
      const first = seenStudent.get(s.id)
      if (first) {
        problems.push(
          `student id "${s.id}" appears twice (groups "${first}" and "${group.id}") — ` +
            'IDs must be unique because every student has one folder per problem set'
        )
      } else {
        seenStudent.set(s.id, group.id)
      }
    }
  }

  if (problems.length) {
    throw new Error('students.json is invalid:\n  - ' + problems.join('\n  - '))
  }

  return {
    class: raw.class ?? 'EAIB101',
    groups: raw.groups.map((group) => ({
      id: group.id,
      label: group.label,
      students: group.students.map(({ id, name }) => ({ id, name, group: group.id })),
    })),
  }
}

// --- problem sets ---------------------------------------------------------

export function loadProblemSets() {
  const raw = JSON.parse(readFileSync(join(ROOT, 'scripts', 'problem-sets.json'), 'utf8'))
  const problems = []

  if (!Array.isArray(raw.sets) || raw.sets.length === 0) {
    throw new Error('problem-sets.json: "sets" must be a non-empty array')
  }

  const seen = new Set()
  for (const set of raw.sets) {
    if (!set.id || !ID_RE.test(set.id)) {
      problems.push(`problem set id ${JSON.stringify(set.id)} is missing or not URL-safe`)
      continue
    }
    if (seen.has(set.id)) problems.push(`duplicate problem set id "${set.id}"`)
    seen.add(set.id)
    if (!['published', 'planned'].includes(set.status)) {
      problems.push(`problem set "${set.id}" has status ${JSON.stringify(set.status)} — expected "published" or "planned"`)
    }
    if (set.status === 'published' && !set.title) {
      problems.push(`problem set "${set.id}" is published but has no title`)
    }
    for (const step of set.steps ?? []) {
      for (const block of step.blocks ?? []) {
        if (!['list', 'code', 'note'].includes(block.type)) {
          problems.push(`problem set "${set.id}", step "${step.n}": unknown block type ${JSON.stringify(block.type)}`)
        }
      }
    }
  }

  if (problems.length) {
    throw new Error('problem-sets.json is invalid:\n  - ' + problems.join('\n  - '))
  }

  return { class: raw.class ?? 'EAIB101', course: raw.course ?? '', sets: raw.sets }
}

// --- submission state -----------------------------------------------------

// Has this student submitted for this problem set? A folder that is missing,
// or that still holds the generated placeholder, counts as pending.
export function submissionState(setId, studentId) {
  const page = join(studentDir(setId, studentId), 'index.html')
  if (!existsSync(page)) return { exists: false, submitted: false }
  return { exists: true, submitted: !readFileSync(page, 'utf8').includes(PLACEHOLDER_MARKER) }
}

// Attaches per-student submission state for one problem set and counts it up.
export function groupsFor(set, roster) {
  const groups = roster.groups.map((group) => {
    const students = group.students.map((s) => ({ ...s, ...submissionState(set.id, s.id) }))
    const done = students.filter((s) => s.submitted).length
    return { ...group, students, done, total: students.length, pct: pct(done, students.length) }
  })
  const done = groups.reduce((n, g) => n + g.done, 0)
  const total = groups.reduce((n, g) => n + g.total, 0)
  return { groups, done, total, pct: pct(done, total) }
}

export const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0)

// Folders inside a problem set that no group claims. They are still served,
// but nothing links to them — usually a typo or a removed student.
export function findOrphanFolders(setId, roster) {
  const dir = setDir(setId)
  if (!existsSync(dir)) return []
  const known = new Set(roster.groups.flatMap((g) => g.students.map((s) => s.id)))
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !known.has(e.name))
    .map((e) => e.name)
}
