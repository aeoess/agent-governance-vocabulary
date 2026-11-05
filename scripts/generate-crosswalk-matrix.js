#!/usr/bin/env node
// generate-crosswalk-matrix.js — build the system × signal-type match grid.
// Reads vocabulary.yaml and crosswalk/**.yaml. The matrix is a build output,
// not a committed file: main publishes it, and PRs render it in CI.
//
// Usage:
//   node scripts/generate-crosswalk-matrix.js
//       writes .generated/matrix/crosswalk-matrix.md
//   node scripts/generate-crosswalk-matrix.js --check
//       loads and renders strictly, checks the output contract, writes nothing
//   node scripts/generate-crosswalk-matrix.js --stdout
//       prints the Markdown
//   node scripts/generate-crosswalk-matrix.js --site <dir> [--source-sha <sha>]
//       writes <dir>/index.html and <dir>/crosswalk-matrix.md for publication
//   --root <dir>   read vocabulary.yaml and crosswalk/ from <dir> instead
//
// Exit 1 on any load error (a crosswalk that does not parse, or is empty) or
// output contract failure, in every mode. A file that parses but has no
// signal_types block is a valid alternative-format crosswalk and is listed,
// not failed.
'use strict'

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { normalizeDoc, aliasesFromVocab } = require('./match-types')

const REPO_ROOT = path.resolve(__dirname, '..')
const DEFAULT_OUT = path.join(REPO_ROOT, '.generated', 'matrix', 'crosswalk-matrix.md')
const REPO_URL = 'https://github.com/aeoess/agent-governance-vocabulary'
const PAGES_URL = 'https://aeoess.github.io/agent-governance-vocabulary/'
// The committed matrix was replaced by a pointer to the published page. An
// older branch merging its full copy back would bring the stale-copy problem
// back, so the pointer must keep the link and carry no table.
const POINTER_REL = path.join('docs', 'generated', 'crosswalk-matrix.md')

// A pipe inside a Markdown table cell would start a new column. It is written
// as an HTML entity, so no backslash in the text can undo the escape.
const mdCell = s => String(s).replace(/\|/g, '&#124;')

const BADGE = {
  exact:        '✅',
  partial:      '🟡',
  structural:   '🟠',
  false_analog: '🔵',
  no_mapping:   '⚪',
}
// Match types that count as a mapping in the coverage stats. false_analog and
// no_mapping record a difference, or a signal not found in the sources the
// crosswalk names, so they count as addressed but never as mapped. They do not
// establish that the system lacks the capability. An ungraded entry is
// a legacy row that claims a mapping without a strength, so it counts as mapped.
const POSITIVE_MATCHES = new Set(['exact', 'structural', 'partial', '__ungraded__'])

const NOT_ADDRESSED = '—' // signal absent from the crosswalk
const UNGRADED = '·'      // mapped but no `match` field declared
// Evidence qualifiers. `emitted` is unmarked because it is the reading a bare
// badge already implies. The marks exist for the states a reader would
// otherwise over-read.
const EVIDENCE_MARK = {
  inferable:  'ʰ', // superscript h, computed by the consumer, not asserted
  referenced: 'ʳ', // superscript r, resolved out of band
}

// Per signal: `mapped` counts systems with a positive match, `addressed`
// counts systems with any entry, including false_analog and no_mapping.
function coverageCounts(systems, signals) {
  const out = {}
  for (const sig of signals) out[sig] = { mapped: 0, addressed: 0 }
  for (const sys of systems) {
    for (const sig of signals) {
      const cell = sys.cells[sig]
      if (!cell) continue
      out[sig].addressed += 1
      if (POSITIVE_MATCHES.has(cell.match)) out[sig].mapped += 1
    }
  }
  return out
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

// "aeoess-aps.yaml" -> "APS". "agent-did.yaml" -> "Agent-Did". Nested files
// keep their directory prefix.
const ACRONYMS = new Set(['aps', 'a2a', 'jep', 'sar', 'rnwy', 'satp', 'sint', 'pic', 'asqav', 'dcp'])
function systemLabel(crosswalkDir, filePath) {
  const rel = path.relative(crosswalkDir, filePath).replace(/\.yaml$|\.yml$/i, '')
  const parts = rel.split(path.sep)
  const base = parts[parts.length - 1].replace(/^aeoess-/i, '')
  const titled = base.split('-').map(w =>
    ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
  ).join('-')
  return parts.length > 1 ? `${parts.slice(0, -1).join('/')}/${titled}` : titled
}

// Load vocabulary and crosswalks. Never throws on crosswalk content: problems
// are returned in `errors` and the caller decides. `normalize: false` exists
// only so a test can prove the deprecated-spelling check catches a renderer
// that skips normalization.
function loadInputs(root = REPO_ROOT, { normalize = true } = {}) {
  const vocab = yaml.load(fs.readFileSync(path.join(root, 'vocabulary.yaml'), 'utf8'))
  const signals = Object.entries(vocab.signal_types || {}).map(([name, e]) => ({
    name, status: (e && typeof e.status === 'string') ? e.status : 'unstated',
  }))
  const signalNames = signals.map(s => s.name)
  const aliases = aliasesFromVocab(vocab)
  const crosswalkDir = path.join(root, 'crosswalk')

  const systems = []
  const altFormat = []
  const reverseSkipped = []
  const testFixtures = []
  const errors = []

  for (const f of walkYaml(crosswalkDir)) {
    const rel = path.relative(root, f).split(path.sep).join('/')
    if (path.basename(f).startsWith('_')) { testFixtures.push(rel); continue }

    let doc
    try {
      doc = yaml.load(fs.readFileSync(f, 'utf8'))
    } catch (e) {
      errors.push(`${rel}: YAML does not parse (${String(e.reason || e.message).split('\n')[0]})`)
      continue
    }
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      errors.push(`${rel}: empty or not a mapping`)
      continue
    }
    // Normalize deprecated match spellings before anything reads `match`
    // (issue #153). Generated output never shows the alias.
    if (normalize) normalizeDoc(doc, aliases)

    if (doc.crosswalk_type === 'rfc_category_reverse') { reverseSkipped.push(rel); continue }
    if (!doc.signal_types || typeof doc.signal_types !== 'object') {
      altFormat.push({ rel, note: 'no signal_types block (alternative crosswalk format)' })
      continue
    }

    const cells = {}
    for (const [key, entry] of Object.entries(doc.signal_types)) {
      const name = (entry && entry.canonical) || key
      if (!signalNames.includes(name)) continue
      const m = entry && entry.match
      const ev = entry && entry.evidence
      cells[name] = {
        match: typeof m === 'string' ? m : '__ungraded__',
        evidence: typeof ev === 'string' ? ev : null,
      }
    }
    systems.push({ label: systemLabel(crosswalkDir, f), rel, cells })
  }

  systems.sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }))
  return { signals, systems, altFormat, reverseSkipped, testFixtures, errors }
}

function cellText(cell) {
  if (!cell) return NOT_ADDRESSED
  const m = cell.match
  const base = m === '__ungraded__' ? UNGRADED : (BADGE[m] || m) // unknown match value renders as-is
  // The evidence qualifier travels with the claim. A mapping that is exact in
  // shape but not carried by the artifact must never render as a bare exact.
  return base + (EVIDENCE_MARK[cell.evidence] || '')
}

function buildModel(inputs) {
  const names = inputs.signals.map(s => s.name)
  const coverage = coverageCounts(inputs.systems, names)
  const n = inputs.systems.length
  const byCoverage = inputs.signals
    .map(s => ({
      sig: s.name,
      status: s.status,
      mapped: coverage[s.name].mapped,
      addressed: coverage[s.name].addressed,
      pct: n === 0 ? 0 : Math.round((coverage[s.name].mapped / n) * 100),
    }))
    .sort((a, b) => b.mapped - a.mapped || a.sig.localeCompare(b.sig))
  const statusCounts = {}
  for (const s of inputs.signals) statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
  return {
    ...inputs,
    rows: inputs.systems.map(sys => ({ label: sys.label, rel: sys.rel, cells: names.map(sig => cellText(sys.cells[sig])) })),
    byCoverage,
    statusCounts,
  }
}

function statusSummary(statusCounts) {
  const order = ['canonical', 'proposed', 'reserved']
  const keys = [...order.filter(k => statusCounts[k]), ...Object.keys(statusCounts).filter(k => !order.includes(k)).sort()]
  return keys.map(k => `${statusCounts[k]} ${k}`).join(', ')
}

function provenance(opts) {
  return opts.sourceSha ? ` from \`${opts.sourceSha}\`` : ''
}

function renderMarkdown(model, opts = {}) {
  const date = opts.date || new Date().toISOString().slice(0, 10)
  const names = model.signals.map(s => s.name)
  const n = model.systems.length
  const lines = []
  lines.push('# Crosswalk Matrix')
  lines.push('')
  lines.push(`Generated on ${date}${provenance(opts)}. ${n} systems × ${names.length} signal types (${statusSummary(model.statusCounts)}).`)
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
  const table = [['System', ...names], ...model.rows.map(r => [r.label, ...r.cells])].map(r => r.map(mdCell))
  const widths = table[0].map((_, c) => Math.max(...table.map(r => String(r[c]).length)))
  const row = r => '| ' + r.map((cell, c) => String(cell) + ' '.repeat(Math.max(0, widths[c] - String(cell).length))).join(' | ') + ' |'
  lines.push(row(table[0]))
  lines.push('| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |')
  for (const r of table.slice(1)) lines.push(row(r))
  lines.push('')
  lines.push('## Coverage')
  lines.push('')
  lines.push(`- Systems represented: ${n}`)
  lines.push(`- Signal types: ${names.length} (${statusSummary(model.statusCounts)})`)
  lines.push('')
  lines.push('### Per-signal coverage')
  lines.push('')
  lines.push('Mapped counts systems with an `exact`, `structural` or `partial` match, or a legacy ungraded entry. Addressed also counts `false_analog` and `no_mapping`. Those record a difference, or a signal not found in the sources the crosswalk names, not necessarily a capability the system lacks. Status is the signal type\'s status in `vocabulary.yaml`.')
  lines.push('')
  lines.push('| Signal type | Status | Systems mapped | Systems addressed | Mapped coverage |')
  lines.push('|---|---|---|---|---|')
  for (const s of model.byCoverage) {
    lines.push(`| \`${s.sig}\` | ${s.status} | ${s.mapped} / ${n} | ${s.addressed} / ${n} | ${s.pct}% |`)
  }
  lines.push('')
  lines.push('### Top-3 most-mapped')
  lines.push('')
  for (const s of model.byCoverage.slice(0, 3)) lines.push(`- \`${s.sig}\` — ${s.mapped}/${n} (${s.pct}%)`)
  lines.push('')
  lines.push('### Top-3 least-mapped')
  lines.push('')
  for (const s of [...model.byCoverage].reverse().slice(0, 3)) lines.push(`- \`${s.sig}\` — ${s.mapped}/${n} (${s.pct}%)`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('Generated by `scripts/generate-crosswalk-matrix.js` from the crosswalks in this repository. Do not edit.')
  lines.push('')
  if (model.altFormat.length > 0) {
    lines.push('## Alternative-format crosswalks not represented in this matrix')
    lines.push('')
    for (const { rel, note } of model.altFormat) lines.push(`- \`${rel}\` — ${note}`)
    lines.push('')
  }
  if (model.reverseSkipped.length > 0) {
    lines.push('## Reverse crosswalks (separate matrix)')
    lines.push('')
    for (const rel of model.reverseSkipped) lines.push(`- \`${rel}\` — \`crosswalk_type: rfc_category_reverse\``)
    lines.push('')
  }
  if (model.testFixtures.length > 0) {
    lines.push('## Test fixtures (excluded)')
    lines.push('')
    for (const rel of model.testFixtures) lines.push(`- \`${rel}\` — deliberate negative-control fixture`)
    lines.push('')
  }
  return lines.join('\n')
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function renderHtml(model, opts = {}) {
  const date = opts.date || new Date().toISOString().slice(0, 10)
  const names = model.signals.map(s => s.name)
  const status = Object.fromEntries(model.signals.map(s => [s.name, s.status]))
  const n = model.systems.length
  const sha = opts.sourceSha
  const src = sha ? ` from <a href="${esc(REPO_URL)}/commit/${esc(sha)}"><code>${esc(sha.slice(0, 12))}</code></a>` : ''
  const fileLink = rel => sha ? `<a href="${esc(REPO_URL)}/blob/${esc(sha)}/${esc(rel)}"><code>${esc(rel)}</code></a>` : `<code>${esc(rel)}</code>`
  const h = []
  h.push('<!doctype html>')
  h.push('<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">')
  h.push('<title>Crosswalk Matrix</title>')
  h.push(`<meta name="source-commit" content="${esc(sha || '')}">`)
  h.push('<style>')
  h.push(':root{--bg:#fff;--fg:#1a1a1a;--muted:#5c5c5c;--line:#d9d9d9;--head:#f4f4f4;--link:#0b57d0}')
  h.push('@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#e8e8e8;--muted:#a8a8a8;--line:#3a3a3a;--head:#1f1f1f;--link:#8ab4f8}}')
  h.push('body{margin:0 auto;max-width:1200px;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}')
  h.push('a{color:var(--link)}code{font-size:.9em}.muted{color:var(--muted)}')
  h.push('.scroll{overflow-x:auto;border:1px solid var(--line);margin:12px 0}')
  h.push('table{border-collapse:collapse;font-size:14px}th,td{border:1px solid var(--line);padding:4px 8px;text-align:center;white-space:nowrap}')
  h.push('thead th{background:var(--head);position:sticky;top:0}th.sys,td.sys{text-align:left;position:sticky;left:0;background:var(--bg)}thead th.sys{background:var(--head);z-index:1}')
  h.push('th.sig{writing-mode:vertical-rl;transform:rotate(180deg);vertical-align:bottom}')
  h.push('table.cov td{text-align:left}')
  h.push('</style></head><body>')
  h.push('<h1>Crosswalk Matrix</h1>')
  h.push(`<p>Generated on ${esc(date)}${src}. ${n} systems × ${names.length} signal types (${esc(statusSummary(model.statusCounts))}).</p>`)
  h.push('<h2>Cell legend</h2><ul>')
  h.push(`<li>${BADGE.exact} <code>exact</code>: same question, same surface shape</li>`)
  h.push(`<li>${BADGE.structural} <code>structural</code>: same question, different surface</li>`)
  h.push(`<li>${BADGE.partial} <code>partial</code>: overlapping but not identical scope</li>`)
  h.push(`<li>${BADGE.false_analog} <code>false_analog</code>: different question, close enough to be mistaken for the canonical primitive</li>`)
  h.push(`<li>${BADGE.no_mapping} <code>no_mapping</code>: explicit gap with technical rationale</li>`)
  h.push(`<li>${EVIDENCE_MARK.inferable} suffix: <code>evidence: inferable</code>, the consumer computes the value and the issuer never asserts it</li>`)
  h.push(`<li>${EVIDENCE_MARK.referenced} suffix: <code>evidence: referenced</code>, resolved out of band against state the artifact does not carry</li>`)
  h.push(`<li>${UNGRADED} mapped but no <code>match</code> strength declared (legacy schema)</li>`)
  h.push(`<li>${NOT_ADDRESSED} not addressed by this crosswalk</li></ul>`)
  h.push('<h2>Matrix</h2><div class="scroll"><table><thead><tr><th class="sys">System</th>')
  for (const sig of names) h.push(`<th class="sig" title="${esc(status[sig])}"><code>${esc(sig)}</code></th>`)
  h.push('</tr></thead><tbody>')
  for (const r of model.rows) {
    h.push(`<tr><td class="sys">${sha ? `<a href="${esc(REPO_URL)}/blob/${esc(sha)}/${esc(r.rel)}">${esc(r.label)}</a>` : esc(r.label)}</td>`)
    r.cells.forEach((c, i) => h.push(`<td title="${esc(names[i])}">${esc(c)}</td>`))
    h.push('</tr>')
  }
  h.push('</tbody></table></div>')
  h.push('<h2>Coverage</h2>')
  h.push(`<p>Systems represented: ${n}. Signal types: ${names.length} (${esc(statusSummary(model.statusCounts))}).</p>`)
  h.push('<p>Mapped counts systems with an <code>exact</code>, <code>structural</code> or <code>partial</code> match, or a legacy ungraded entry. Addressed also counts <code>false_analog</code> and <code>no_mapping</code>. Those record a difference, or a signal not found in the sources the crosswalk names, not necessarily a capability the system lacks. Status is the signal type\'s status in <code>vocabulary.yaml</code>.</p>')
  h.push('<div class="scroll"><table class="cov"><thead><tr><th>Signal type</th><th>Status</th><th>Systems mapped</th><th>Systems addressed</th><th>Mapped coverage</th></tr></thead><tbody>')
  for (const s of model.byCoverage) {
    h.push(`<tr><td><code>${esc(s.sig)}</code></td><td>${esc(s.status)}</td><td>${s.mapped} / ${n}</td><td>${s.addressed} / ${n}</td><td>${s.pct}%</td></tr>`)
  }
  h.push('</tbody></table></div>')
  const list = (title, items) => {
    if (items.length === 0) return
    h.push(`<h2>${esc(title)}</h2><ul>`)
    for (const [rel, note] of items) h.push(`<li>${fileLink(rel)}: ${esc(note)}</li>`)
    h.push('</ul>')
  }
  list('Alternative-format crosswalks not represented in this matrix', model.altFormat.map(a => [a.rel, a.note]))
  list('Reverse crosswalks (separate matrix)', model.reverseSkipped.map(r => [r, 'crosswalk_type: rfc_category_reverse']))
  list('Test fixtures (excluded)', model.testFixtures.map(r => [r, 'deliberate negative-control fixture']))
  h.push(`<p class="muted">Generated by <code>scripts/generate-crosswalk-matrix.js</code> from <a href="${esc(REPO_URL)}">${esc(REPO_URL.replace('https://', ''))}</a>. Do not edit.</p>`)
  h.push('</body></html>')
  return h.join('\n') + '\n'
}

// The output contract. Returns a list of problems, empty when the output is sound.
function checkPointer(root) {
  const file = path.join(root, POINTER_REL)
  if (!fs.existsSync(file)) return []
  const text = fs.readFileSync(file, 'utf8')
  const problems = []
  if (!text.split('\n').some(line => line.trim() === PAGES_URL)) problems.push(`${POINTER_REL} no longer links to ${PAGES_URL}`)
  if (/^\|\s*-{3,}/m.test(text)) problems.push(`${POINTER_REL} contains a Markdown table. The matrix is published, not committed.`)
  return problems
}

// Every line of one Markdown table must have the same number of pipes. Cell
// text never contains a literal pipe (see mdCell), so every pipe is a border.
function markdownTableProblems(markdown) {
  const problems = []
  let expected = null
  for (const line of String(markdown).split('\n')) {
    if (!line.startsWith('|')) { expected = null; continue }
    const pipes = (line.match(/\|/g) || []).length
    if (expected === null) expected = pipes
    else if (pipes !== expected) problems.push(`Markdown table row has ${pipes - 1} columns, expected ${expected - 1}: ${line.slice(0, 60)}`)
  }
  return problems
}

function checkOutput(model, markdown, html, legacySpellings = []) {
  const problems = []
  if (typeof markdown !== 'string' || markdown.trim().length === 0) problems.push('Markdown output is empty')
  problems.push(...markdownTableProblems(markdown))
  if (typeof html !== 'string' || html.trim().length === 0) problems.push('HTML output is empty')
  const width = model.signals.length
  for (const r of model.rows) {
    if (r.cells.length !== width) problems.push(`row ${r.label} has ${r.cells.length} cells, expected ${width}`)
    const source = model.systems.find(system => system.rel === r.rel)
    model.signals.forEach((signal, index) => {
      const cell = source && source.cells[signal.name]
      const mark = cell && EVIDENCE_MARK[cell.evidence]
      if (mark && !String(r.cells[index]).endsWith(mark)) problems.push(`${r.label}/${signal.name}: evidence qualifier lost`)
    })
  }
  const labels = new Set()
  for (const r of model.rows) {
    if (labels.has(r.label)) problems.push(`two crosswalks render as system ${r.label}`)
    labels.add(r.label)
  }
  for (const legacy of legacySpellings) {
    if (markdown.includes(legacy)) problems.push(`Markdown output contains the deprecated spelling ${legacy}`)
    if (html.includes(legacy)) problems.push(`HTML output contains the deprecated spelling ${legacy}`)
  }
  for (const s of model.byCoverage) {
    if (s.mapped > s.addressed) problems.push(`${s.sig}: mapped ${s.mapped} exceeds addressed ${s.addressed}`)
  }
  return problems
}

function legacySpellingsFromVocab(root = REPO_ROOT) {
  const vocab = yaml.load(fs.readFileSync(path.join(root, 'vocabulary.yaml'), 'utf8'))
  return Object.keys(vocab.crosswalk_match_type_aliases || {})
}

function arg(name) {
  const i = process.argv.indexOf(name)
  if (i === -1) return undefined
  const value = process.argv[i + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`)
  return value
}

function main() {
  const root = path.resolve(arg('--root') || REPO_ROOT)
  const sourceSha = arg('--source-sha')
  const site = arg('--site')
  const modes = ['--check', '--stdout', '--site'].filter(name => process.argv.includes(name))
  if (modes.length > 1) throw new Error('Choose only one output mode')
  const inputs = loadInputs(root)
  if (inputs.errors.length > 0) {
    console.error('generate-crosswalk-matrix: crosswalks that cannot be loaded')
    for (const e of inputs.errors) console.error(`  ${e}`)
    process.exit(1)
  }
  const pointer = checkPointer(root)
  if (pointer.length > 0) {
    console.error('generate-crosswalk-matrix: the committed matrix pointer is wrong')
    for (const p of pointer) console.error(`  ${p}`)
    process.exit(1)
  }
  const model = buildModel(inputs)
  const md = renderMarkdown(model, { sourceSha })
  const html = renderHtml(model, { sourceSha })
  const problems = checkOutput(model, md, html, legacySpellingsFromVocab(root))
  if (problems.length > 0) {
    console.error('generate-crosswalk-matrix: output contract failed')
    for (const p of problems) console.error(`  ${p}`)
    process.exit(1)
  }

  if (process.argv.includes('--check')) {
    console.log(`generate-crosswalk-matrix --check: ${model.systems.length} systems × ${model.signals.length} signal types rendered, output contract holds`)
    return
  }
  if (process.argv.includes('--stdout')) { process.stdout.write(md); return }
  if (site) {
    fs.mkdirSync(site, { recursive: true })
    fs.writeFileSync(path.join(site, 'index.html'), html, 'utf8')
    fs.writeFileSync(path.join(site, 'crosswalk-matrix.md'), md, 'utf8')
    console.log(`generate-crosswalk-matrix: wrote ${site}/index.html and crosswalk-matrix.md`)
    return
  }
  fs.mkdirSync(path.dirname(DEFAULT_OUT), { recursive: true })
  fs.writeFileSync(DEFAULT_OUT, md, 'utf8')
  console.log(`generate-crosswalk-matrix: wrote ${path.relative(REPO_ROOT, DEFAULT_OUT)}`)
  console.log(`  ${model.systems.length} systems × ${model.signals.length} signal types`)
}

if (require.main === module) {
  try {
    main()
  } catch (e) {
    console.error(`generate-crosswalk-matrix: ${e.message}`)
    process.exit(1)
  }
}

module.exports = {
  checkPointer,
  markdownTableProblems,
  coverageCounts, POSITIVE_MATCHES, loadInputs, buildModel, renderMarkdown, renderHtml,
  checkOutput, legacySpellingsFromVocab,
}
