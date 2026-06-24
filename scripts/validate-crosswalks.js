#!/usr/bin/env node
// validate-crosswalks.js — enum + structural validator for crosswalk YAMLs.
// Reads vocabulary.yaml, checks every crosswalk/*.yaml against it.
// Usage: node scripts/validate-crosswalks.js [--verbose]
// Exit:  0 = all pass, 1 = any failure
'use strict'

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const ROOT = path.resolve(__dirname, '..')
const VOCAB_PATH = path.join(ROOT, 'vocabulary.yaml')
const CROSSWALK_DIR = path.join(ROOT, 'crosswalk')
const verbose = process.argv.includes('--verbose')

const vocab = yaml.load(fs.readFileSync(VOCAB_PATH, 'utf8'))
const canonicalSignalTypes = new Set(Object.keys(vocab.signal_types || {}))
const canonicalMatchTypes = new Set(Object.keys(vocab.crosswalk_match_types || {}))
// decision_trajectory entries are valid signal-level keys (veritasacta maps them)
const canonicalTrajectory = new Set(Object.keys(vocab.decision_trajectory || {}))
const descriptorEnums = {}
for (const [dim, def] of Object.entries(vocab.descriptor_dimensions || {})) {
  if (def && Array.isArray(def.values)) descriptorEnums[dim] = new Set(def.values)
}
const systemAttributeEnums = {}
for (const [attr, def] of Object.entries(vocab.system_attributes || {})) {
  if (def && Array.isArray(def.values)) systemAttributeEnums[attr] = new Set(def.values)
}

// Legacy descriptor overrides — known-stale (file, path, value) tuples that
// pre-date a vocabulary resolution. The validator emits WARNING (not ERROR)
// for these so contributor CI doesn't break on PRs to other parts of those
// files. New non-conformant content does not get an override; the
// whitelist is for forward compatibility on already-merged files only.
const overridesPath = path.join(__dirname, 'legacy-descriptor-overrides.yaml')
const legacyOverrides = fs.existsSync(overridesPath)
  ? (yaml.load(fs.readFileSync(overridesPath, 'utf8'))?.overrides || [])
  : []

function isLegacyOverride(file, dotPath, value) {
  const relFile = path.relative(ROOT, file)
  return legacyOverrides.find(o =>
    o.file === relFile &&
    o.path === dotPath &&
    o.deprecated_value === value,
  )
}

function walkYaml(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkYaml(full))
    // `_`-prefixed files are non-production fixtures (for example the
    // _test-invalid.yaml negative fixture). They are excluded from the main
    // validation pass and handled separately by checkNegativeFixtures so that
    // `npm run validate` exits 0 on production crosswalks. (Issue #111.)
    else if ((entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) && !entry.name.startsWith('_')) out.push(full)
  }
  return out.sort()
}

const errors = []
const warnings = []

function err(file, msg) {
  const rel = path.relative(ROOT, file)
  errors.push(`ERROR  ${rel}: ${msg}`)
}

function warn(file, msg) {
  const rel = path.relative(ROOT, file)
  warnings.push(`WARN   ${rel}: ${msg}`)
}

function isStandardCrosswalk(doc) {
  return doc && typeof doc === 'object' && doc.signal_types && typeof doc.signal_types === 'object'
}

// system_attributes is a top-level crosscutting block defined in vocabulary.yaml
// (signature_capability, canonicalization_profile, hash_family). Each field has
// an explicit enum. Applies to standard AND alternative crosswalk formats.
function validateSystemAttributes(doc, file) {
  const attrs = doc.system_attributes
  if (!attrs || typeof attrs !== 'object') return
  for (const [attrName, value] of Object.entries(attrs)) {
    const allowed = systemAttributeEnums[attrName]
    if (!allowed) {
      warn(file, `system_attributes.${attrName}: unknown attribute (canonical: ${Object.keys(systemAttributeEnums).join(', ')})`)
      continue
    }
    if (typeof value !== 'string') {
      const shape = Array.isArray(value) ? 'array' : typeof value
      warn(file, `system_attributes.${attrName}: value must be a single string from the enum, got ${shape} (allowed: ${[...allowed].join(', ')})`)
      continue
    }
    if (allowed.has(value)) continue
    err(file, `system_attributes.${attrName}: "${value}" not in vocabulary (allowed: ${[...allowed].join(', ')})`)
  }
}

function validateSystem(doc, file) {
  const sys = doc.system
  if (!sys) { err(file, 'missing `system` block'); return }
  if (typeof sys === 'string') { warn(file, '`system` is a plain string, not a block with `name`+`repo`/`home`'); return }
  if (!sys.name) err(file, '`system.name` is required')
  if (!sys.home && !sys.repo) warn(file, '`system` has neither `home` nor `repo` URL')
}

// domain_incubation files are silent-skipped from strict signal_types
// checks but carry their own gates: a required verified_at date field
// and a 90-day sunset measured from that date. Promotion to a standard
// crosswalk_type or deletion is required before sunset.
const DOMAIN_INCUBATION_SUNSET_MS = 90 * 24 * 60 * 60 * 1000

function validateDomainIncubation(doc, file) {
  if (doc.verified_at === undefined || doc.verified_at === null || doc.verified_at === '') {
    err(file, 'domain_incubation requires verified_at field')
    return
  }

  // verified_at may be EITHER a scalar ISO 8601 date (original form) OR a
  // per-system map whose every value is a parseable ISO 8601 date, for a
  // crosswalk that incubates several systems verified on different dates
  // (e.g. payment_rail: { x402: <date>, ap2: <date>, ... }). The map is the
  // more-truthful shape. The 90-day sunset is measured from the EARLIEST
  // per-system date, so the file is only as fresh as its stalest column.
  if (typeof doc.verified_at === 'object'
      && !(doc.verified_at instanceof Date)
      && !Array.isArray(doc.verified_at)) {
    const entries = Object.entries(doc.verified_at)
    if (entries.length === 0) {
      err(file, 'domain_incubation verified_at map is empty; needs at least one system date')
      return
    }
    let earliestMs = Infinity
    let bad = false
    for (const [sysKey, val] of entries) {
      // js-yaml parses bare ISO dates into Date objects; accept Date or string.
      const ms = Date.parse(val instanceof Date ? val.toISOString() : val)
      if (Number.isNaN(ms)) {
        err(file, `domain_incubation verified_at.${sysKey} "${val}" is not a parseable ISO 8601 date`)
        bad = true
        continue
      }
      if (ms < earliestMs) earliestMs = ms
    }
    if (bad) return
    if (earliestMs + DOMAIN_INCUBATION_SUNSET_MS < Date.now()) {
      err(file, 'file is past 90-day sunset; re-verify or promote (oldest per-system verified_at)')
    }
    return
  }

  // Scalar path: unchanged.
  const verifiedMs = Date.parse(doc.verified_at)
  if (Number.isNaN(verifiedMs)) {
    err(file, `domain_incubation verified_at "${doc.verified_at}" is not a parseable ISO 8601 date`)
    return
  }
  if (verifiedMs + DOMAIN_INCUBATION_SUNSET_MS < Date.now()) {
    err(file, 'file is past 90-day sunset; re-verify or promote')
  }
}

// Signal-type lifecycle status enforcement on vocabulary.yaml itself. Every
// signal type carries an explicit status recording how much independent
// production evidence stands behind the term. Mirrors the domain_incubation
// sunset style (Date.parse against now), but the deadline is the entry's own
// absolute review_by date rather than a fixed offset. See CONTRIBUTING.md
// "Signal-type lifecycle and status".
const VALID_SIGNAL_STATUS = new Set(['canonical', 'proposed', 'reserved', 'deprecated'])
// Implementer-specific artifact heuristic: a kid token, an http(s) endpoint, an
// `-ed25519-` key-id fragment, or a >=32-char hex string (a hash) embedded in a
// canonical definition belongs in a crosswalk, not the definition.
const IMPLEMENTER_ARTIFACT_RE = /\bkid\b|https?:\/\/|-ed25519-|[0-9a-f]{32,}/i

function validateSignalStatus(vocab) {
  const signalTypes = (vocab && vocab.signal_types) || {}
  for (const [name, entry] of Object.entries(signalTypes)) {
    if (!entry || typeof entry !== 'object') continue
    const status = entry.status
    if (status === undefined || status === null || status === '') {
      warn(VOCAB_PATH, `signal_types.${name}: no status field; treat as proposed and assign one`)
    } else if (!VALID_SIGNAL_STATUS.has(status)) {
      err(VOCAB_PATH, `signal_types.${name}: invalid status "${status}" (allowed: ${[...VALID_SIGNAL_STATUS].join(', ')})`)
    } else if (status === 'canonical') {
      const issuers = (entry.issuers_in_production || []).length
      if (issuers < 2) {
        err(VOCAB_PATH, `signal_types.${name}: canonical requires >=2 independent implementations, found ${issuers}`)
      }
    } else if (status === 'proposed' || status === 'reserved') {
      const reviewBy = entry.review_by
      // js-yaml turns a bare ISO date into a Date object; accept both forms.
      const reviewStr = reviewBy instanceof Date ? reviewBy.toISOString().slice(0, 10) : reviewBy
      if (reviewBy === undefined || reviewBy === null || reviewBy === '') {
        err(VOCAB_PATH, `signal_types.${name}: ${status} requires review_by (ISO date)`)
      } else if (Number.isNaN(Date.parse(reviewStr))) {
        err(VOCAB_PATH, `signal_types.${name}: ${status} review_by "${reviewStr}" is not a parseable ISO date`)
      } else if (Date.parse(reviewStr) < Date.now()) {
        err(VOCAB_PATH, `signal_types.${name}: review_by ${reviewStr} passed; promote/re-date (proposed) or remove (reserved)`)
      }
      if (status === 'proposed' && (entry.promotion_trigger === undefined || entry.promotion_trigger === null || entry.promotion_trigger === '')) {
        warn(VOCAB_PATH, `signal_types.${name}: proposed missing promotion_trigger`)
      }
    }
    // Definition purity (all statuses). WARN ONLY this round: it documents the
    // step-C cleanup TODO without breaking the build.
    if (typeof entry.definition === 'string' && IMPLEMENTER_ARTIFACT_RE.test(entry.definition)) {
      warn(VOCAB_PATH, `signal_types.${name}: definition embeds an implementer-specific artifact (kid/endpoint/hash); move to crosswalk`)
    }
  }
}

function validateSignalTypes(doc, file) {
  for (const [key, entry] of Object.entries(doc.signal_types)) {
    if (!entry || typeof entry !== 'object') continue
    const canonical = entry.canonical || key
    if (!canonicalSignalTypes.has(canonical) && !canonicalTrajectory.has(canonical)) {
      err(file, `signal_types.${key}: canonical "${canonical}" is not in vocabulary.yaml signal_types or decision_trajectory`)
    }
    if (entry.match) {
      if (!canonicalMatchTypes.has(entry.match)) {
        err(file, `signal_types.${key}: match "${entry.match}" not in crosswalk_match_types (allowed: ${[...canonicalMatchTypes].join(', ')})`)
      }
      if ((entry.match === 'structural' || entry.match === 'partial') && !entry.divergence && !entry.notes) {
        warn(file, `signal_types.${key}: match "${entry.match}" has no divergence or notes explaining the difference`)
      }
      if (entry.match === 'no_mapping' && !entry.notes && !entry.note) {
        warn(file, `signal_types.${key}: match "no_mapping" without a note explaining the gap`)
      }
    }
  }
}

// Validate a single descriptor block of shape { dim_name: value | [values] }.
// dotPathPrefix is the dotted path used in diagnostic messages — keeps the
// existing message format on the top-level nested-per-signal path while
// extending coverage to nested signal_types.<key>.descriptor_dimensions and
// to flat top-level shapes (jep / agentlair).
function validateDescriptorBlock(block, file, dotPathPrefix) {
  if (!block || typeof block !== 'object') return
  for (const [dimName, value] of Object.entries(block)) {
    if (dimName.endsWith('_notes')) continue
    const allowed = descriptorEnums[dimName]
    if (!allowed) continue
    const values = Array.isArray(value) ? value : [value]
    for (const v of values) {
      if (typeof v !== 'string') continue
      if (allowed.has(v)) continue
      const dotPath = `${dotPathPrefix}.${dimName}`
      const override = isLegacyOverride(file, dotPath, v)
      if (override) {
        warn(file, `${dotPath}: deprecated value "${v}" — ${override.note} See https://github.com/aeoess/agent-governance-vocabulary/issues/${override.resolution_issue}.`)
      } else {
        err(file, `${dotPath}: "${v}" not in vocabulary (allowed: ${[...allowed].join(', ')})`)
      }
    }
  }
}

function validateDescriptors(doc, file) {
  // Top-level descriptor_dimensions, nested-per-signal shape:
  //   { sigKey: { dim_name: value } }
  // Existing behavior preserved: flat top-level shapes (e.g. agentlair,
  // jep) are not validated here. Pre-resolution v0.1 crosswalks that use
  // a flat top-level shape are out of scope for this hardening pass.
  const dims = doc.descriptor_dimensions
  if (dims && typeof dims === 'object') {
    for (const [sigKey, dimBlock] of Object.entries(dims)) {
      if (!dimBlock || typeof dimBlock !== 'object') continue
      validateDescriptorBlock(dimBlock, file, `descriptor_dimensions.${sigKey}`)
    }
  }

  // Per-signal nested: signal_types.<key>.descriptor_dimensions
  // Pre-resolution v0.1 crosswalks declared descriptors INSIDE a signal_types
  // entry rather than at the top level (dcp-ai.yaml is the live example).
  // The top-level walk never visited these; this loop closes that gap.
  const sigs = doc.signal_types
  if (sigs && typeof sigs === 'object') {
    for (const [sigKey, entry] of Object.entries(sigs)) {
      if (!entry || typeof entry !== 'object') continue
      if (!entry.descriptor_dimensions) continue
      validateDescriptorBlock(
        entry.descriptor_dimensions,
        file,
        `signal_types.${sigKey}.descriptor_dimensions`,
      )
    }
  }
}

// Fail-closed reverify enforcement.
//
// Field contract (cell-level, applies to any crosswalk shape):
//   reverify_by: <ISO 8601 date>     the cell MUST be re-verified by this date.
//   reverify_after: <ISO 8601 date>  the claim holds until this date; the cell
//                                    MUST be re-verified after it.
// Both are deadlines. A cell is FRESH only if it carries a sibling evidence
// marker on the same cell:
//   reverified_at: <ISO 8601 date>  (preferred) or verified_at: <ISO 8601 date>
// whose date is at or after the governing deadline. If the deadline is in the
// past and no such fresher marker is present, the cell validates to a `stale`
// state and the run FAILS (non-zero) rather than passing silently. If both
// reverify_by and reverify_after are present the EARLIER deadline governs (most
// conservative). An unparseable or non-string reverify date is a hard error.
// Note: only structured keys are enforced. A reverify date mentioned in free
// text (for example inside a status_note string) is documentation, not a field.
const REVERIFY_MARKERS = ['reverified_at', 'verified_at']

function validateReverify(node, file, dotPath) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((item, i) => validateReverify(item, file, `${dotPath}[${i}]`))
    return
  }
  const dp = dotPath || '(root)'
  const deadlines = []
  for (const key of ['reverify_by', 'reverify_after']) {
    if (node[key] === undefined || node[key] === null) continue
    const raw = node[key]
    const str = raw instanceof Date ? raw.toISOString().slice(0, 10) : raw
    if (typeof str !== 'string') {
      err(file, `${dp}.${key}: must be an ISO 8601 date string, got ${typeof raw}`)
      continue
    }
    const ms = Date.parse(str)
    if (Number.isNaN(ms)) {
      err(file, `${dp}.${key}: "${str}" is not a parseable ISO 8601 date`)
      continue
    }
    deadlines.push({ key, str, ms })
  }
  if (deadlines.length > 0) {
    const gov = deadlines.reduce((a, b) => (b.ms < a.ms ? b : a))
    if (gov.ms < Date.now()) {
      let fresh = false
      for (const m of REVERIFY_MARKERS) {
        const mv = node[m]
        if (mv === undefined || mv === null) continue
        // js-yaml parses bare ISO dates into Date objects; accept both Date and string.
        const mstr = mv instanceof Date ? mv.toISOString() : (typeof mv === 'string' ? mv : null)
        if (mstr === null) continue
        const mm = Date.parse(mstr)
        if (!Number.isNaN(mm) && mm >= gov.ms) { fresh = true; break }
      }
      if (!fresh) {
        err(file, `${dp}: cell is stale: ${gov.key} ${gov.str} is in the past with no fresher reverified_at/verified_at marker; re-verify and update the marker (fail-closed reverify rule)`)
      }
    }
  }
  for (const [k, v] of Object.entries(node)) {
    if (v && typeof v === 'object') validateReverify(v, file, dotPath ? `${dotPath}.${k}` : k)
  }
}

function validateFile(file) {
  let doc
  try {
    doc = yaml.load(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    err(file, `YAML parse error: ${e.message}`)
    return
  }
  if (!doc || typeof doc !== 'object') {
    err(file, 'file is empty or not an object')
    return
  }

  // Fail-closed reverify enforcement runs on every crosswalk shape, before the
  // type-specific early returns, so a stale cell fails regardless of format.
  validateReverify(doc, file, '')

  if (doc.crosswalk_type === 'rfc_category_reverse') {
    if (verbose) console.log(`  skip  ${path.relative(ROOT, file)} (reverse crosswalk)`)
    return
  }

  if (doc.crosswalk_type === 'domain_incubation') {
    validateDomainIncubation(doc, file)
    if (verbose) console.log(`  skip  ${path.relative(ROOT, file)} (domain incubation)`)
    return
  }

  // system_attributes is a crosscutting block that applies to all crosswalk
  // formats (standard + alternative). Validate before the alternative-format
  // early return.
  validateSystemAttributes(doc, file)

  if (!isStandardCrosswalk(doc)) {
    warn(file, 'no `signal_types` section found; skipping validation (alternative crosswalk format)')
    return
  }

  validateSystem(doc, file)
  validateSignalTypes(doc, file)
  validateDescriptors(doc, file)
}

const files = walkYaml(CROSSWALK_DIR)
if (files.length === 0) {
  console.log('No crosswalk YAML files found.')
  process.exit(0)
}

// Global gate: domain_incubation is an exemption from strict signal_types
// checks, so its population is capped to keep the silent-skip surface
// bounded. Reviewer-enforced gates (maintainer-only marker) live in
// CONTRIBUTING.md; the cap is validator-enforced here.
const DOMAIN_INCUBATION_MAX = 3
const incubationFiles = []
for (const file of files) {
  let doc
  try {
    doc = yaml.load(fs.readFileSync(file, 'utf8'))
  } catch {
    continue // YAML parse error surfaces inside validateFile
  }
  if (doc && doc.crosswalk_type === 'domain_incubation') incubationFiles.push(file)
}
if (incubationFiles.length > DOMAIN_INCUBATION_MAX) {
  const rels = incubationFiles.map(f => path.relative(ROOT, f)).join(', ')
  errors.push(`ERROR  crosswalk/: ${incubationFiles.length} files carry crosswalk_type: domain_incubation; max allowed is ${DOMAIN_INCUBATION_MAX} (${rels})`)
}

console.log(`validate-crosswalks: checking ${files.length} file(s) against vocabulary.yaml`)
console.log(`  signal types: ${[...canonicalSignalTypes].join(', ')}`)
console.log(`  match types:  ${[...canonicalMatchTypes].join(', ')}`)
console.log(`  dimensions:   ${Object.keys(descriptorEnums).join(', ')}`)
console.log(`  system attrs: ${Object.keys(systemAttributeEnums).join(', ')}`)
console.log('')

// Negative fixtures (crosswalk/_*.yaml) must FAIL validation. Each is run
// through the validator in isolation, asserted to produce at least one error,
// and its expected diagnostics are then discarded from the production tally.
// If a fixture stops failing, that is itself a hard error: either the validator
// or the fixture has drifted. (Issue #111: the fixture used to run in the main
// pass, which made `npm run validate` exit non-zero on production crosswalks.)
function checkNegativeFixtures() {
  let names = []
  try {
    names = fs.readdirSync(CROSSWALK_DIR)
      .filter(n => n.startsWith('_') && (n.endsWith('.yaml') || n.endsWith('.yml')))
      .sort()
  } catch { return }
  for (const name of names) {
    const file = path.join(CROSSWALK_DIR, name)
    const eBefore = errors.length
    const wBefore = warnings.length
    validateFile(file)
    const added = errors.length - eBefore
    errors.length = eBefore
    warnings.length = wBefore
    if (added === 0) {
      err(file, 'negative fixture is expected to FAIL validation but produced 0 errors; the validator or the fixture has drifted')
    } else if (verbose) {
      console.log(`  ok    ${path.relative(ROOT, file)} (negative fixture correctly rejected: ${added} expected error(s))`)
    }
  }
}

for (const file of files) {
  const rel = path.relative(ROOT, file)
  if (verbose) console.log(`  check ${rel}`)
  validateFile(file)
}

checkNegativeFixtures()

// Vocabulary-level lifecycle check: every signal type in vocabulary.yaml must
// carry a valid status with the evidence its status implies. Runs once, after
// the per-crosswalk signal/system checks.
validateSignalStatus(vocab)

if (warnings.length > 0) {
  console.log('')
  for (const w of warnings) console.log(w)
}

if (errors.length > 0) {
  console.log('')
  for (const e of errors) console.log(e)
  console.log('')
  console.log(`FAIL: ${errors.length} error(s), ${warnings.length} warning(s) across ${files.length} file(s)`)
  process.exit(1)
}

console.log('')
console.log(`PASS: 0 errors, ${warnings.length} warning(s) across ${files.length} file(s)`)
process.exit(0)
