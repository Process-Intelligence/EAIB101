// Creates public/student/<ID>/index.html for every roster entry that does not
// have one yet.
//
//   npm run scaffold
//
// Existing files are never touched — a student's submitted work can never be
// overwritten by this script. Run it after adding students to
// scripts/students.json, then run `npm run index`.

import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadRoster, findOrphanFolders, STUDENT_DIR } from './roster.mjs'
import { placeholderPage } from './placeholder.mjs'

const { groups } = loadRoster()

let created = 0
let kept = 0

for (const group of groups) {
  for (const student of group.students) {
    const dir = join(STUDENT_DIR, student.id)
    const page = join(dir, 'index.html')
    if (existsSync(page)) {
      kept++
      continue
    }
    mkdirSync(dir, { recursive: true })
    writeFileSync(page, placeholderPage(student), 'utf8')
    console.log(`  + ${group.id}/${student.id} — ${student.name}`)
    created++
  }
}

for (const orphan of findOrphanFolders(groups)) {
  console.warn(`  ! public/student/${orphan}/ is not on any roster — nothing links to it`)
}

console.log(`scaffold: ${created} page(s) created, ${kept} left untouched`)
