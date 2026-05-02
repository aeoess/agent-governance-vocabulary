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
    else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) out.push(full)
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

function validateSystem(doc, file) {
  const sys = doc.system
  if (!sys) { err(file, 'missing `system` block'); return }
  if (typeof sys === 'string') { warn(file, '`system` is a plain string, not a block with `name`+`repo`/`home`'); return }
  if (!sys.name) err(file, '`system.name` is required')
  if (!sys.home && !sys.repo) warn(file, '`system` has neither `home` nor `repo` URL')
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

  if (doc.crosswalk_type === 'rfc_category_reverse') {
    if (verbose) console.log(`  skip  ${path.relative(ROOT, file)} (reverse crosswalk)`)
    return
  }
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

console.log(`validate-crosswalks: checking ${files.length} file(s) against vocabulary.yaml`)
console.log(`  signal types: ${[...canonicalSignalTypes].join(', ')}`)
console.log(`  match types:  ${[...canonicalMatchTypes].join(', ')}`)
console.log(`  dimensions:   ${Object.keys(descriptorEnums).join(', ')}`)
console.log('')

for (const file of files) {
  const rel = path.relative(ROOT, file)
  if (verbose) console.log(`  check ${rel}`)
  validateFile(file)
}

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
