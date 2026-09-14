// Loads and validates scripts/students.json.
//
// The roster is grouped: every student belongs to exactly one program group.
// Student folders under public/student/ are flat, so student IDs must be
// unique across *all* groups — that is checked here and is a hard error.

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const STUDENT_DIR = join(ROOT, 'public', 'student')
export const ROSTER_FILE = join(ROOT, 'scripts', 'students.json')

// Text unique to the generated placeholder page. A student page still
// containing it has not been submitted yet.
export const PLACEHOLDER_MARKER = 'Түр зуурын хуудас'

const ID_RE = /^[A-Za-z0-9_-]+$/

export function loadRoster() {
  const raw = JSON.parse(readFileSync(ROSTER_FILE, 'utf8'))
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
            'IDs must be unique because every student has one folder under public/student/'
        )
      } else {
        seenStudent.set(s.id, group.id)
      }
    }
  }

  if (problems.length) {
    throw new Error('students.json is invalid:\n  - ' + problems.join('\n  - '))
  }

  const groups = raw.groups.map((group) => ({
    id: group.id,
    label: group.label,
    students: group.students.map(({ id, name }) => ({
      id,
      name,
      group: group.id,
      ...readState(id),
    })),
  }))

  return { class: raw.class ?? 'EAIB101', groups }
}

// Has this student submitted? A folder that is missing, or that still holds the
// generated placeholder, counts as pending.
function readState(id) {
  const page = join(STUDENT_DIR, id, 'index.html')
  if (!existsSync(page)) return { exists: false, submitted: false }
  const html = readFileSync(page, 'utf8')
  return { exists: true, submitted: !html.includes(PLACEHOLDER_MARKER) }
}

// Folders under public/student/ that no group claims. These are still served,
// but nothing links to them — usually a typo or a removed student.
export function findOrphanFolders(groups) {
  if (!existsSync(STUDENT_DIR)) return []
  const known = new Set(groups.flatMap((g) => g.students.map((s) => s.id)))
  return readdirSync(STUDENT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !known.has(e.name))
    .map((e) => e.name)
}

export const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
