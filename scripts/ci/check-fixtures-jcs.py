#!/usr/bin/env python3
"""Replay the RFC 8785 (JCS) byte vectors, then canonicalize every shared fixture.

Two checks, both from the pinned agent-evidence-vectors package:

1. The package's reference canonicalizer passes the shipped byte vectors
   (`vectors-a2a-jcs-v01`, target rfc8785), so the fixture digests below mean
   what RFC 8785 says they mean.
2. Every JSON file under fixtures/ parses without duplicate keys, NaN or
   Infinity, has an RFC 8785 canonical form, and that form is a fixed point
   (canonicalizing the canonical bytes returns the same bytes).

The SHA-256 of each file's canonical bytes goes to stdout, and to the job
summary when GITHUB_STEP_SUMMARY is set, so a change to a fixture's value
shows up as a digest change in review even when formatting changes hide it.
Exit status: 0 all checks passed, 1 a check failed, 2 the check did not run.
"""
from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

try:
    from agent_evidence_vectors import a2ajcs
except ImportError as error:  # the pinned package is not installed
    print(f"cannot import agent_evidence_vectors: {error}", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "fixtures"


def replay_byte_vectors() -> list[str]:
    """One line per RFC 8785 byte vector the reference canonicalizer fails."""
    return list(a2ajcs.check(a2ajcs.canonicalize, target="rfc8785"))


def check_fixture(path: Path) -> tuple[str, str | None]:
    """Return (sha256 of the canonical bytes or '', failure text or None)."""
    try:
        canonical = a2ajcs.canonicalize(a2ajcs.parse(path.read_text(encoding="utf-8")))
        again = a2ajcs.canonicalize(a2ajcs.parse(canonical.decode("utf-8")))
    except Exception as error:  # a refusal or a parse error is the finding
        return "", f"{type(error).__name__}: {error}"
    if again != canonical:
        return "", "canonical form is not a fixed point"
    return hashlib.sha256(canonical).hexdigest(), None


def main() -> int:
    files = sorted(FIXTURES.rglob("*.json"))
    if not files:
        print(f"no JSON fixtures under {FIXTURES}; nothing was checked", file=sys.stderr)
        return 2
    rows: list[str] = []
    failed = 0
    vector_failures = replay_byte_vectors()
    for line in vector_failures:
        print(f"JCS byte vector failed: {line}")
    for path in files:
        digest, problem = check_fixture(path)
        rel = path.relative_to(ROOT).as_posix()
        if problem:
            failed += 1
            print(f"FAIL {rel}: {problem}")
            rows.append(f"| `{rel}` | FAIL: {problem} |")
        else:
            print(f"ok   {rel} {digest}")
            rows.append(f"| `{rel}` | `{digest}` |")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as out:
            out.write("## RFC 8785 canonical digests of the shared fixtures\n\n")
            out.write(f"JCS byte vectors failed by the reference canonicalizer: {len(vector_failures)}\n\n")
            out.write("| fixture | SHA-256 of canonical bytes |\n| --- | --- |\n")
            out.write("\n".join(rows) + "\n")
    print(f"{len(files) - failed} of {len(files)} fixtures canonicalize; {len(vector_failures)} byte vectors failed")
    return 1 if (failed or vector_failures) else 0


if __name__ == "__main__":
    sys.exit(main())
