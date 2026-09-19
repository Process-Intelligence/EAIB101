// Creates public/ps/<SET_ID>/<STUDENT_ID>/index.html for every student on the
// roster who does not have one yet, for every *published* problem set.
//
//   npm run scaffold                 create missing placeholder pages
//   npm run scaffold -- --refresh    also rewrite pages that still hold a
//                                    generated placeholder, so a change to
//                                    placeholder.mjs reaches them
//
// Planned problem sets get no student folders — there is nothing to submit yet,
// so the repo stays free of hundreds of empty pages.
//
// A submitted page is never touched, with or without --refresh: only a file
// that still carries the placeholder marker is ever rewritten. A folder that
// holds files but no index.html (a page uploaded under the wrong name, say) is
// left alone and reported rather than having a placeholder dropped beside the
// student's work. Run this after adding students or publishing a problem set,
// then run `npm run index`.

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  loadRoster,
  loadProblemSets,
  inspectSetDir,
  studentDir,
  studentFolderFiles,
  isLegacyPlaceholder,
  PLACEHOLDER_MARKER,
} from './roster.mjs'
import { placeholderPage } from './placeholder.mjs'

const refresh = process.argv.includes('--refresh')

try {
  const roster = loadRoster()
  const { sets } = loadProblemSets()
  const published = sets.filter((s) => s.status === 'published')

  let created = 0
  let refreshed = 0
  let kept = 0
  let attention = 0

  for (const set of published) {
    for (const group of roster.groups) {
      for (const student of group.students) {
        const dir = studentDir(set.id, student.id)
        const page = join(dir, 'index.html')
        const html = placeholderPage({ ...student, set })

        if (existsSync(page)) {
          const current = readFileSync(page, 'utf8')
          const placeholder = current.includes(PLACEHOLDER_MARKER) || isLegacyPlaceholder(current)
          if (refresh && placeholder && current !== html) {
            writeFileSync(page, html, 'utf8')
            console.log(`  ~ ps/${set.id}/${student.id} — ${student.name} (placeholder refreshed)`)
            refreshed++
          } else {
            kept++
          }
          continue
        }

        const files = studentFolderFiles(set.id, student.id)
        if (files && files.length) {
          const lookalike = files.find((f) => /^index\.html?$/i.test(f))
          console.warn(
            `  ! ps/${set.id}/${student.id}/ holds ${files.join(', ')} but no index.html` +
              (lookalike ? ` — rename ${lookalike} to index.html` : '') +
              '; left alone'
          )
          attention++
          continue
        }

        mkdirSync(dir, { recursive: true })
        writeFileSync(page, html, 'utf8')
        console.log(`  + ps/${set.id}/${student.id} — ${student.name} (${group.id})`)
        created++
      }
    }
    const { orphans, strays } = inspectSetDir(set.id, roster)
    for (const o of orphans) console.warn(`  ! public/ps/${set.id}/${o}/ is not on any roster — nothing links to it`)
    for (const f of strays) console.warn(`  ! public/ps/${set.id}/${f} is a stray file — published, but nothing links to it`)
  }
  for (const w of roster.warnings) console.warn(`  ! ${w}`)

  const planned = sets.length - published.length
  console.log(
    `scaffold: ${created} page(s) created, ${refreshed} placeholder(s) refreshed, ${kept} left untouched` +
      (attention ? `, ${attention} folder(s) need attention` : '') +
      ` (${published.length} published problem set(s), ${planned} planned)`
  )
  if (attention) process.exitCode = 1
} catch (e) {
  console.error(e.message)
  process.exitCode = 1
}
