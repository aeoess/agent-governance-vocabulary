# Crosswalk Matrix

The crosswalk matrix is no longer committed to this repository. It is generated from `main` after every merge and published at:

https://aeoess.github.io/agent-governance-vocabulary/

The published page names the `main` commit it was built from, and links each system to its crosswalk file at that commit. A Markdown copy is published beside it as `crosswalk-matrix.md`.

To build it from your own checkout:

```bash
npm run generate:matrix
```

This writes `.generated/matrix/crosswalk-matrix.md`, which is ignored by git.
