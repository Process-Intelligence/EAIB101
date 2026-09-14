// Creates public/ps/<SET_ID>/<STUDENT_ID>/index.html for every student on the
// roster who does not have one yet, for every *published* problem set.
//
//   npm run scaffold
//
// Planned problem sets get no student folders — there is nothing to submit yet,
// so the repo stays free of hundreds of empty pages.
//
// Existing files are never touched, so a student's submitted work can never be
// overwritten. Run this after adding students or publishing a problem set, then
// run `npm run index`.

import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadRoster, loadProblemSets, findOrphanFolders, studentDir } from './roster.mjs'
import { placeholderPage } from './placeholder.mjs'

const roster = loadRoster()
const { sets } = loadProblemSets()
const published = sets.filter((s) => s.status === 'published')

let created = 0
let kept = 0

for (const set of published) {
  for (const group of roster.groups) {
    for (const student of group.students) {
      const dir = studentDir(set.id, student.id)
      const page = join(dir, 'index.html')
      if (existsSync(page)) {
        kept++
        continue
      }
      mkdirSync(dir, { recursive: true })
      writeFileSync(page, placeholderPage({ ...student, set }), 'utf8')
      console.log(`  + ps/${set.id}/${student.id} — ${student.name} (${group.id})`)
      created++
    }
  }
  for (const orphan of findOrphanFolders(set.id, roster)) {
    console.warn(`  ! public/ps/${set.id}/${orphan}/ is not on any roster — nothing links to it`)
  }
}

const planned = sets.length - published.length
console.log(
  `scaffold: ${created} page(s) created, ${kept} left untouched ` +
    `(${published.length} published problem set(s), ${planned} planned)`
)
