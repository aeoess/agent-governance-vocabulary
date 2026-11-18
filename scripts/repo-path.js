'use strict'
// Path helpers shared by the validator, with the path module injectable so
// the Windows behavior can be tested on any platform (path.win32).
const path = require('path')

// Repository paths in allowlists are written with "/". path.relative()
// returns the platform separator, "\" on Windows, so an exact comparison
// against an allowlist never matches there. Compare in "/" form.
function relPosix(root, file, p = path) {
  return p.relative(root, file).split(p.sep).join('/')
}

// A resolved path is inside the root when it equals the root or starts with
// the root plus the separator. The separator stops a sibling such as
// /repo-other from counting as inside /repo.
function isInside(real, rootReal, p = path) {
  return real === rootReal || real.startsWith(rootReal + p.sep)
}

module.exports = { relPosix, isInside }
