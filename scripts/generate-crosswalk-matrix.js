#!/usr/bin/env node
// generate-crosswalk-matrix.js — emit a system × signal-type match grid.
// Reads vocabulary.yaml and crosswalk/*.yaml, writes
// docs/generated/crosswalk-matrix.md.
// Usage: node scripts/generate-crosswalk-matrix.js            writes the matrix
//        node scripts/generate-crosswalk-matrix.js --check    verifies it
// Exit:  0 when written, or when --check finds the committed file current.
//        1 only from --check, when the committed matrix differs from what the
//        generator produces, or is missing. The write path still never fails on
//        content: the validator owns correctness and this is a docs build.
'use strict'

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { normalizeDoc, aliasesFromVocab } = require('./match-types')

const ROOT = path.resolve(__dirname, '..')
const VOCAB_PATH = path.join(ROOT, 'vocabulary.yaml')
const CROSSWALK_DIR = path.join(ROOT, 'crosswalk')
const OUT_DIR = path.join(ROOT, 'docs', 'generated')
const OUT_PATH = path.join(OUT_DIR, 'crosswalk-matrix.md')
// --check renders and compares instead of writing; see the end of main().
const checkOnly = process.argv.includes('--check')

const BADGE = {
  exact:                       '✅',  // ✅
  partial:                     '🟡', // 🟡
  structural:                  '🟠', // 🟠
  false_analog:                '🔵', // 🔵
  no_mapping:                  '⚪',       // ⚪
}
const NOT_ADDRESSED = '—' // — em dash, signal absent from crosswalk
const UNGRADED = '·'      // mapped but no `match` field declared
// Evidence qualifiers. `emitted` is unmarked because it is the reading a bare
// badge already implies; the marks exist for the states a reader would
// otherwise over-read.
const EVIDENCE_MARK = {
  inferable:  '\u02b0', // superscript h, "computed by the consumer, not asserted"
  referenced: '\u02b3', // superscript r, "resolved out of band"
}

function walkYaml(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkYaml(full))
    else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) out.push(full)
  }
  return out.sort()
}

// "aeoess-aps.yaml" -> "APS". "agent-did.yaml" -> "Agent-Did".
// Strip leading "aeoess-" (own-namespace prefix) before title-casing.
// Special-cases: known acronyms uppercase entirely.
const ACRONYMS = new Set(['aps', 'a2a', 'jep', 'sar', 'rnwy', 'satp', 'sint', 'pic', 'asqav', 'dcp'])
function systemLabel(filePath) {
  // Take the basename (without extension), strip leading "aeoess-" so
  // own-namespace crosswalks read as the system, then title-case each
  // hyphen-separated segment. Known acronyms uppercase entirely.
  // For nested files (e.g. satp/behavioral-trust.yaml), keep the dir
  // prefix lowercased so the row stays readable.
  const rel = path.relative(CROSSWALK_DIR, filePath).replace(/\.yaml$|\.yml$/i, '')
  const parts = rel.split(path.sep)
  const base = parts[parts.length - 1].replace(/^aeoess-/i, '')
  const titled = base.split('-').map(w =>
    ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
  ).join('-')
  if (parts.length > 1) {
    const dir = parts.slice(0, -1).join('/')
    return `${dir}/${titled}`
  }
  return titled
}

function loadCrosswalk(filePath, aliases) {
  try {
    const doc = yaml.load(fs.readFileSync(filePath, 'utf8'))
    if (!doc || typeof doc !== 'object') return null
    // Normalize deprecated match spellings before anything reads `match`
    // (issue #153). The generator stays silent about it: the validator owns
    // the deprecation warning, and generated output never shows the alias.
    normalizeDoc(doc, aliases)
    return doc
  } catch {
    return null
  }
}

function pad(s, n) { return s + ' '.repeat(Math.max(0, n - s.length)) }

function main() {
  // 1. Load vocabulary, get canonical signal types in declaration order.
  const vocab = yaml.load(fs.readFileSync(VOCAB_PATH, 'utf8'))
  const canonicalSignals = Object.keys(vocab.signal_types || {})

  // 2. Walk crosswalk/, classify each file.
  const files = walkYaml(CROSSWALK_DIR)
  const systems = []   // standard-format, included in matrix
  const altFormat = [] // no signal_types block — listed in footer
  const reverseSkipped = [] // crosswalk_type === 'rfc_category_reverse'
  const testFixtures = [] // _test-invalid.yaml etc

  for (const f of files) {
    const rel = path.relative(ROOT, f)
    const base = path.basename(f)
    if (base.startsWith('_')) { testFixtures.push(rel); continue }

    const doc = loadCrosswalk(f, aliasesFromVocab(vocab))
    if (!doc) { altFormat.push({ rel, note: 'YAML parse failed or empty file' }); continue }

    if (doc.crosswalk_type === 'rfc_category_reverse') {
      reverseSkipped.push(rel)
      continue
    }

    if (!doc.signal_types || typeof doc.signal_types !== 'object') {
      altFormat.push({ rel, note: 'no signal_types block (alternative crosswalk format)' })
      continue
    }

    // Build the per-canonical-signal map for this system.
    // Entries with a `match` field get the badge; entries that exist
    // without a graded match get the UNGRADED marker (mapped without
    // strength grade).
    const cells = {}
    for (const [key, entry] of Object.entries(doc.signal_types)) {
      const canonical = (entry && entry.canonical) || key
      if (!canonicalSignals.includes(canonical)) continue
      const m = entry && entry.match
      const ev = entry && entry.evidence
      cells[canonical] = {
        match: typeof m === 'string' ? m : '__ungraded__',
        evidence: typeof ev === 'string' ? ev : null,
      }
    }

    systems.push({
      label: systemLabel(f),
      rel,
      cells,
    })
  }

  systems.sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }))

  // 3. Build the table.
  const header = ['System', ...canonicalSignals]
  const rows = [header]
  for (const sys of systems) {
    const row = [sys.label]
    for (const sig of canonicalSignals) {
      const cell = sys.cells[sig]
      if (!cell) { row.push(NOT_ADDRESSED); continue }
      const m = cell.match
      let base
      if (m === '__ungraded__') base = UNGRADED
      else if (BADGE[m]) base = BADGE[m]
      else base = m // unknown match value, render as-is
      // The evidence qualifier travels with the claim. A mapping that is exact in
      // shape but not carried by the artifact must never render as a bare exact.
      row.push(base + (EVIDENCE_MARK[cell.evidence] || ''))
    }
    rows.push(row)
  }

  // Markdown table emission with sane alignment.
  const colWidths = header.map((_, c) => Math.max(...rows.map(r => String(r[c]).length)))
  const renderRow = r => '| ' + r.map((cell, c) => pad(String(cell), colWidths[c])).join(' | ') + ' |'
  const sep = '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |'
  const tableLines = [renderRow(rows[0]), sep, ...rows.slice(1).map(renderRow)]

  // 4. Coverage stats.
  const coverage = {}
  for (const sig of canonicalSignals) coverage[sig] = 0
  for (const sys of systems) {
    for (const sig of canonicalSignals) {
      if (sys.cells[sig]) coverage[sig] += 1 // presence, not strength; unchanged by the evidence axis
    }
  }
  const sortedByCoverage = canonicalSignals
    .map(sig => ({ sig, n: coverage[sig], pct: systems.length === 0 ? 0 : Math.round((coverage[sig] / systems.length) * 100) }))
    .sort((a, b) => b.n - a.n || a.sig.localeCompare(b.sig))

  // 5. Compose the markdown.
  const today = new Date().toISOString().slice(0, 10)
  const lines = []
  lines.push('# Crosswalk Matrix')
  lines.push('')
  lines.push(`Auto-generated on ${today}. ${systems.length} systems × ${canonicalSignals.length} canonical signal types.`)
  lines.push('')
  lines.push('Cell legend:')
  lines.push('')
  lines.push(`- ${BADGE.exact} \`exact\` — same question, same surface shape`)
  lines.push(`- ${BADGE.structural} \`structural\` — same question, different surface`)
  lines.push(`- ${BADGE.partial} \`partial\` — overlapping but not identical scope`)
  lines.push(`- ${BADGE.false_analog} \`false_analog\` — different question, close enough to be mistaken for the canonical primitive`)
  lines.push(`- ${BADGE.no_mapping} \`no_mapping\` — explicit gap with technical rationale`)
  lines.push(`- ${EVIDENCE_MARK.inferable} suffix: \`evidence: inferable\`, the consumer computes the value and the issuer never asserts it`)
  lines.push(`- ${EVIDENCE_MARK.referenced} suffix: \`evidence: referenced\`, resolved out of band against state the artifact does not carry`)
  lines.push(`- ${UNGRADED} mapped but no \`match\` strength declared (legacy schema)`)
  lines.push(`- ${NOT_ADDRESSED} not addressed by this crosswalk`)
  lines.push('')
  lines.push('## Matrix')
  lines.push('')
  lines.push(...tableLines)
  lines.push('')
  lines.push('## Coverage')
  lines.push('')
  lines.push(`- Systems represented: ${systems.length}`)
  lines.push(`- Canonical signal types: ${canonicalSignals.length}`)
  lines.push('')
  lines.push('### Per-signal coverage')
  lines.push('')
  lines.push('| Signal type | Systems mapped | Coverage |')
  lines.push('|---|---|---|')
  for (const { sig, n, pct } of sortedByCoverage) {
    lines.push(`| \`${sig}\` | ${n} / ${systems.length} | ${pct}% |`)
  }
  lines.push('')

  const top3Most = sortedByCoverage.slice(0, 3)
  const top3Least = [...sortedByCoverage].reverse().slice(0, 3)
  lines.push('### Top-3 most-mapped')
  lines.push('')
  for (const { sig, n, pct } of top3Most) {
    lines.push(`- \`${sig}\` — ${n}/${systems.length} (${pct}%)`)
  }
  lines.push('')
  lines.push('### Top-3 least-mapped')
  lines.push('')
  for (const { sig, n, pct } of top3Least) {
    lines.push(`- \`${sig}\` — ${n}/${systems.length} (${pct}%)`)
  }
  lines.push('')

  // 6. Footer — alt-format and reverse exclusions.
  lines.push('---')
  lines.push('')
  lines.push('Auto-generated by `scripts/generate-crosswalk-matrix.js`. Do not edit. Re-run after any crosswalk PR merges.')
  lines.push('')
  if (altFormat.length > 0) {
    lines.push('## Alternative-format crosswalks not represented in this matrix')
    lines.push('')
    for (const { rel, note } of altFormat) {
      lines.push(`- \`${rel}\` — ${note}`)
    }
    lines.push('')
  }
  if (reverseSkipped.length > 0) {
    lines.push('## Reverse crosswalks (separate matrix)')
    lines.push('')
    for (const rel of reverseSkipped) {
      lines.push(`- \`${rel}\` — \`crosswalk_type: rfc_category_reverse\``)
    }
    lines.push('')
  }
  if (testFixtures.length > 0) {
    lines.push('## Test fixtures (excluded)')
    lines.push('')
    for (const rel of testFixtures) {
      lines.push(`- \`${rel}\` — deliberate negative-control fixture`)
    }
    lines.push('')
  }

  // 7. Write, or check.
  //
  // --check renders the matrix in memory and compares it with the committed
  // file, failing if they differ. Without it, a test that only READS
  // docs/generated/crosswalk-matrix.md is not testing the generator: an edit
  // that made this script emit a deprecated token would leave the committed
  // file untouched and the suite green. It also catches the committed matrix
  // going stale against the data, which had happened here silently for weeks.
  //
  // The generated-on date is normalized before comparison. It changes every
  // day by design, and a check that fails daily is a check somebody switches
  // off.
  const rendered = lines.join('\n')
  const DATE_LINE = /^Auto-generated on \d{4}-\d{2}-\d{2}\./m
  if (checkOnly) {
    if (!fs.existsSync(OUT_PATH)) {
      console.error(`generate-crosswalk-matrix --check: ${path.relative(ROOT, OUT_PATH)} does not exist`)
      process.exit(1)
    }
    const committed = fs.readFileSync(OUT_PATH, 'utf8')
    const norm = t => t.replace(DATE_LINE, 'Auto-generated on <date>.')
    if (norm(committed) === norm(rendered)) {
      console.log(`generate-crosswalk-matrix --check: ${path.relative(ROOT, OUT_PATH)} is up to date`)
      return
    }
    const a = norm(committed).split('\n')
    const b = norm(rendered).split('\n')
    console.error(`generate-crosswalk-matrix --check: ${path.relative(ROOT, OUT_PATH)} differs from what the generator produces`)
    let shown = 0
    for (let i = 0; i < Math.max(a.length, b.length) && shown < 10; i++) {
      if (a[i] !== b[i]) {
        console.error(`  line ${i + 1}\n    committed: ${a[i] === undefined ? '(absent)' : a[i]}\n    generated: ${b[i] === undefined ? '(absent)' : b[i]}`)
        shown++
      }
    }
    console.error('  run `npm run generate:matrix` and commit the result')
    process.exit(1)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_PATH, rendered, 'utf8')

  console.log(`generate-crosswalk-matrix: wrote ${path.relative(ROOT, OUT_PATH)}`)
  console.log(`  ${systems.length} systems × ${canonicalSignals.length} signal types`)
  if (altFormat.length > 0) console.log(`  excluded (alt format): ${altFormat.length}`)
  if (reverseSkipped.length > 0) console.log(`  excluded (reverse):   ${reverseSkipped.length}`)
  if (testFixtures.length > 0) console.log(`  excluded (fixtures):  ${testFixtures.length}`)
}

main()
