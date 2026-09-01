# bilateral_receipt purpose gate: executable regression contract

What this pack pins: the obligation to declare a registered `purpose` on a
crosswalk row mapping `bilateral_receipt` is keyed to MATCH STRENGTH, not to the
act of mapping. Shipped in #139, designed in #81.

    exact / structural   MUST declare a registered purpose
    partial              MAY omit it; a real two-party receipt that emits no
                         signed purpose is a documented divergence
    false_analog         MAY omit it, on the same grounds as partial
    no_mapping           MUST NOT declare one; a row asserting no receipt exists
                         while naming a purpose for it is self-contradictory
    any supplied value   MUST be in the registered enum, whether it is a single
                         string or an array

Run it: `npm run check:purpose-gate`

## What is where, and why

`cases.json` holds the twelve cases as data: a match strength, an optional
purpose, and the outcome the shipped validator must produce.

`scripts/validators/check-bilateral-receipt-purpose-gate.js` holds the CONTRACT:
which cases must exist and what each must contract for. The contract lives in
the script rather than beside the cases because the intended CI shape runs the
base branch's copy of the script against the pull request's copy of the data. A
manifest under `fixtures/` would be editable by the same pull request it gates.

That trusted invocation is now wired, in the step named `bilateral_receipt
purpose gate (trusted oracle)`. It landed one commit after the checker itself,
because a commit that both introduced the checker and invoked it from the base
checkout would have failed: the base branch would not have contained it. The pack
also runs in the ordinary `npm test` job, which uses the pull request's own copy
of everything.

## Two properties this pack has that a naive one does not

**Expected failures pin a diagnostic class, not a bare FAIL.** An earlier version
counted an expected-FAIL case as correct whenever any error mentioned the file.
Deleting the exact/structural requirement while adding an unrelated always-firing
rule then produced green checkmarks over a gate that had been regressed. Each
failing case now names the class of diagnostic the validator must emit and must
produce no unexpected additional error.

**The checker reads data from one root and code from another.** Case data and
`vocabulary.yaml` come from the supplied data root; the validator and
`node_modules` always come from the checker's own checkout. An earlier version
resolved the validator from the data root, which would have made the base-owned
checker execute the pull request's validator, inverting the property the trusted
job exists to provide.

**The contract pins each case's input, not just its name.** `REQUIRED_CASES`
carries the match, purpose and expected outcome of every required case, because
the case data is supplied by the pull request. Pinning only id and outcome would
let case 10 change from `false_analog` to `partial`, keeping its id and its
`PASS`, while the contract still reported itself satisfied.

## What the trusted job does and does not give you

The base-owned code means a pull request cannot weaken the gate by editing the
validator or the checker alongside the cases. It does not make the gate
hostile-PR proof. Under `pull_request`, the workflow definition comes from the
pull request, so a change could edit `.github/workflows/validate.yml` and remove
the step. Anchoring that requires a required org or enterprise ruleset workflow,
which is a governance decision made outside this repository. `pull_request_target`
is not adopted here: it runs with elevated permissions, so using it would need a
separate threat model proving the executable code stays base-owned and pull
request bytes are handled strictly as data.

## Adding a case

Add it to `cases.json`, add its id and contracted outcome to `REQUIRED_CASES` in
the checker, and build the mutation that makes it fail. A case that no mutation
can break is not testing anything.
