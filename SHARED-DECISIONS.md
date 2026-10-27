# How shared files are decided

Proposed in [#185](https://github.com/aeoess/agent-governance-vocabulary/issues/185). This file has no force until it is adopted under the bootstrap rule at the end.

## What this covers

This process covers the shared files listed below.

- `PRINCIPLES.md`
- `docs/boundary-map.md`
- `SHARED-DECISIONS.md` (this file)

Adding a file to this list, or removing one, is a change to this file. Moving content out of a shared file into another file is a change to that shared file.

Everything else in this repository, including crosswalks, `vocabulary.yaml`, fixtures and `CONTRIBUTING.md`, keeps the review rules in [CONTRIBUTING.md](CONTRIBUTING.md). `CONTRIBUTING.md` is not a shared file unless a change to this list adds it.

Shared files change only through pull requests merged under this process. The repository administrator does not push changes to them directly. Repository permissions are a separate technical control, and this file does not change them.

## What stays with each project

Each project has final authority over how a shared file describes its own node, its claim semantics and its keys. A maintainer of the project can correct or withdraw that description at any time, whether or not the project takes part in shared decisions. Such a change needs no review window and no approval from other projects. It must stay within the project's own description.

Either project on an edge can withdraw from that edge on its own. Any other change to an edge needs confirmation from both projects it connects.

A change that alters how a shared file describes a project needs that project's explicit confirmation on the pull request. Silence is not confirmation. No vote or other group decision overrides it. This process does not govern anything inside a project's own repository.

These protections hold on every kind of change in the table below, including corrections and records that need no review window. A change described as a correction still needs a project's explicit confirmation if it alters how a shared file describes that project's node, claim semantics or keys.

A change to this section needs confirmation from every project it would affect, and it never applies to a project that has not confirmed it.

## Participating projects

A project takes part in shared decisions only by explicit opt-in. Being listed on the map, joining a pilot, contributing technical work or answering a consultation does not opt a project in. This file covers shared-file decisions only. Economic participation and commitments are outside this process and need their own explicit agreement.

| Project | Representative | Opt-in record |
|---|---|---|
| REMORA | @darklordVirtual | [2026-10-02](https://github.com/aeoess/agent-governance-vocabulary/issues/185#issuecomment-5954508771) |
| invinoveritas | @babyblueviper1 | [2026-10-09](https://github.com/aeoess/agent-governance-vocabulary/issues/185#issuecomment-6086329014) |
| Agent Passport System | @aeoess | [2026-10-15](https://github.com/aeoess/agent-governance-vocabulary/issues/185#issuecomment-6196323607) |
| Horizon Shield (NENRIN, MUSUBI) | @ogasurfproject-jpg | [2026-10-27](https://github.com/aeoess/agent-governance-vocabulary/issues/185#issuecomment-6430258358) |
| AgentAvow | @kenneives | [2026-10-27](https://github.com/aeoess/agent-governance-vocabulary/issues/185#issuecomment-6432567316) |
| Probity AI | @astrogilda | [2026-10-27](https://github.com/aeoess/agent-governance-vocabulary/issues/185#issuecomment-6433740185) |

**Opting in.** A maintainer of the project states the opt-in in a public comment on this repository and names the project's representative for shared decisions. The comment links to a place where the project's own repository names that person as a maintainer, such as a maintainers file, CODEOWNERS, its README or its GitHub organization's members. Anyone may open the pull request that adds the row. The row needs no review window and no approval. If the linked record does not show the maintainer's authority, the row stays pending until the project supplies it.

An opt-in takes effect 7 days after the public comment. A project counts toward a pull request's approvals and votes only if its opt-in took effect before that pull request's window started.

**Representatives.** Only a project's current representative approves or votes for it. A project can replace its representative through another public statement by a maintainer.

**Leaving.** A project leaves through a public statement by a maintainer on this repository. Leaving takes effect at once and needs no approval. Anyone may then remove the row by a pull request that needs no review window. The opt-in and departure records stay linked from the pull request that removes the row.

**After leaving.** Shared files already merged stay as merged. Approvals the project gave on changes that merged before it left still count for those changes. Its approvals and votes on changes not yet merged stop counting. Leaving stops new obligations from arising through this process. It does not cancel a commitment the project already accepted, which stays governed by its own terms.

## Voices

Each participating project has one voice. A person counts once, whichever projects they represent. On any pull request, one person can approve or vote for one project only.

## Changing a shared file

Every change is a public pull request. Review and objections happen on the pull request.

The review window depends on what a change does.

**Early stage.** The federation is in its early stage. No federation pilot is running yet and the map is a working draft, so routine upkeep of checked records should not wait as long as decisions about shared direction. The windows below are set for this stage. When the first federation pilot starts, the participating projects review them through a change to this file. Until a revision is adopted, they stay as written.

| Change | Review window | Approvals and confirmations needed |
|---|---|---|
| Corrections and records: a broken link, a spelling or formatting fix, a newly pinned fixture version, a reproducible run record, or a factual correction. Every example in this row qualifies only if it changes no claim, edge progress or standing, or shared rule | none | one approval, from a participating project other than the author's |
| Verified progress and standing changes: a change to an edge's progress or standing, such as recording an independent run | 48 hours | one approval, from a participating project other than the author's, and confirmation from every project whose claims the change affects |
| New edges and substantive shared claims | 7 days | one approval, from a participating project other than the author's, and explicit confirmation from both projects on an edge |
| Change to `PRINCIPLES.md` or to this file | 14 days | two approvals, from two different participating projects other than the author's |

A pull request that contains more than one kind of change follows the strictest rule that applies to any part of it. If participants disagree about which kind a change is, the longer window applies.

**Faster review for one change.** A specific change can use a shorter window than its kind requires if every participating project explicitly approves the shorter window for that change on its pull request. The agreement and the window it sets stay recorded on the pull request. Every other requirement still applies. Changes to `PRINCIPLES.md` and to this file keep their 14-day window. Adopting this file has its own rule under Bootstrap.

Every agreement to a shorter window, including under Bootstrap, names a commit and must be renewed after a substantive revision.

**Author's project.** Every project whose maintainer wrote or co-authored the change is an author's project. Its approvals do not count toward the table's approval threshold. Its explicit agreement is still required for a shorter window.

**Window.** Except during Bootstrap, the window starts when the pull request is opened, or when it leaves draft if it was opened as a draft.

**Approvals.** An approval is an explicit approval by a participating project's representative, recorded on the pull request, of a named commit. A change to the text after an approval ends that approval unless the approver confirms the new commit. A change that alters any requirement, condition, outcome or project description restarts the window. Any participating project can say on the pull request that a change did so, and the window then restarts. Spelling, link and formatting fixes do not restart it. A change that moves a pull request into a kind with a longer window restarts it under that longer window.

**Objections.** An objection names the specific problem with the change. A participating project, or a project whose description the change touches, can raise one. It is resolved when the text is corrected to address it, when the objector withdraws it, or when a vote under this section selects between the competing versions. A vote never replaces a project's required confirmation of its own description. The objection and its outcome stay recorded on the pull request.

**Votes.** If an objection is still open when the window closes, any participating project can call a vote on the pull request. The call lists the competing versions, always including keeping the current text, and any participating project can add a version before voting opens. Voting lasts 7 days from the call. Each participating project votes once. The version with the most votes is selected. A tie, or no votes, keeps the current text. A selected change still needs its review window and its required approvals before it merges.

**Merge.** A change is ready to merge when its window has closed, its approvals cover its final commit, every required project confirmation is recorded, no objection is open and the repository's required checks pass. The repository administrator merges it within 3 days. The merge carries out the recorded decision and adds no approval of its own. If the merge cannot happen, the administrator states the blocking condition publicly on the pull request.

## No retroactive effect

No rule here applies to anything decided before it was adopted. Taking part in an earlier pilot or appearing on the map is not consent to any rule adopted later.

## Bootstrap

This pull request proposes both the process and the conditions for adopting it. Adoption needs explicit approvals of the final commit from REMORA and invinoveritas, the two participating projects other than Agent Passport System, which authored it. Because this file is adopted in the early stage, its review window is 72 hours from the final commit if every project that answered #185 agrees to that on this pull request. Otherwise it is 14 days from the final commit. The participants for this review are the projects whose public opt-in on #185 exists when the pull request opens. Changing that set, in the table or otherwise, restarts the review. For this review, each project's representative is the maintainer who posted its opt-in on #185, as listed in the table. The fast opt-in rule does not operate before adoption. Any project that answered #185 can raise an objection during this review.

If those approvals are not given, the process stays unadopted. The two required approvals cannot be lowered.

Once it is adopted, `PRINCIPLES.md` ([#178](https://github.com/aeoess/agent-governance-vocabulary/pull/178)) and `docs/boundary-map.md` ([#179](https://github.com/aeoess/agent-governance-vocabulary/pull/179)) start fresh reviews under it. Support given on them before adoption does not count as an approval.
