#!/usr/bin/env node
// test-repo-path.js - Windows path handling in the validator, tested on any
// platform through path.win32. On Windows, path.relative() returns "\", and
// the validator's allowlists are written with "/", so before this fix the nine
// pre-scope fixtures and the legacy descriptor overrides never matched there.
'use strict'

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { relPosix, isInside } = require('../repo-path')

const ROOT = path.resolve(__dirname, '..', '..')
let passed = 0
let failed = 0
function check(name, cond, detail) {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); failed++ }
}

const W = path.win32
const WROOT = 'C:\\work\\agent-governance-vocabulary'
const toWin = rel => W.join(WROOT, ...rel.split('/'))

console.log('repository paths on Windows (path.win32)')

check('1. a crosswalk path is returned in "/" form', relPosix(WROOT, toWin('crosswalk/nobulex.yaml'), W) === 'crosswalk/nobulex.yaml')
check('2. a nested fixture path is returned in "/" form', relPosix(WROOT, toWin('fixtures/interop-week-1/step-2-asqav.json'), W) === 'fixtures/interop-week-1/step-2-asqav.json')
check('3. POSIX paths are unchanged', relPosix('/r', '/r/crosswalk/a.yaml', path.posix) === 'crosswalk/a.yaml')

const overrides = yaml.load(fs.readFileSync(path.join(ROOT, 'scripts', 'legacy-descriptor-overrides.yaml'), 'utf8')).overrides || []
const missed = overrides.map(o => o.file).filter(f => relPosix(WROOT, toWin(f), W) !== f)
check(`4. every legacy override file (${overrides.length}) matches its allowlist entry on Windows`, overrides.length > 0 && missed.length === 0, missed.join(', '))

const src = fs.readFileSync(path.join(ROOT, 'scripts', 'validate-crosswalks.js'), 'utf8')
const block = src.slice(src.indexOf('const LEGACY_FIXTURES'), src.indexOf('])', src.indexOf('const LEGACY_FIXTURES')))
const legacy = [...block.matchAll(/'([^']+)'/g)].map(m => m[1])
const missedFx = legacy.filter(f => relPosix(WROOT, toWin(f), W) !== f)
check(`5. every pre-scope fixture (${legacy.length}) matches its allowlist entry on Windows`, legacy.length > 0 && missedFx.length === 0, missedFx.join(', '))
check('6. the validator compares fixtures and overrides through relPosix', /isLegacyOverride[\s\S]{0,200}relPosix\(ROOT, file\)/.test(src) && /const rel = relPosix\(ROOT, full\)/.test(src))

check('7. a file inside the root is inside', isInside(W.join(WROOT, 'crosswalk', 'a.yaml'), WROOT, W))
check('8. the root itself is inside', isInside(WROOT, WROOT, W))
check('9. a sibling directory with the root as a prefix is outside', !isInside('C:\\work\\agent-governance-vocabulary-evil\\a.yaml', WROOT, W))
check('10. a path that escapes the root is outside', !isInside(W.resolve(WROOT, '..', 'other', 'a.yaml'), WROOT, W))
check('11. a "/" separated path is not treated as inside a Windows root', !isInside('C:/work/agent-governance-vocabulary/a.yaml', WROOT, W))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
