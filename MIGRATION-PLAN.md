# Moving this repository to its own organization

This plan follows #244. It proposes transferring this repository from @aeoess's personal account to `nosai-federation`, with the display name Federation of Neutral Open-Source AI Infrastructure.

Nothing moves until this plan has been open as a public pull request for at least 14 days and at least two participating projects other than APS have explicitly supported it. Material changes to the plan need review before transfer. Support for the move on #244 will be recorded alongside any conditions attached to it.

## What moves

The vocabulary, shared files, issues, pull requests and history stay together through GitHub's repository transfer. Each project keeps control of its own entries. The review rules in SHARED-DECISIONS.md remain unchanged.

## Access after the move

@aeoess would be the only organization owner at transfer. Adding another owner would be a separate decision under the process below.

A single owner is a recovery risk: if that account is lost or locked, nobody can change organization settings until GitHub restores access. The maintainers can keep working on the repository in the meantime, because the Maintain role does not depend on the owner being reachable. Adding a second owner is the lasting fix and goes through the process below.

@darklordVirtual and @Poke-nushi have offered to help maintain the repository. Each would receive the Maintain role after agreeing a scope and time commitment. @ogasurfproject-jpg has also offered bounded help with shared files and crosswalk rows. That offer still needs a scope and access decision.

Maintain permits code and workflow changes, merging under the repository's rules, and some settings changes, including Pages configuration. It does not grant organization ownership or control over repository access, branch protection, deletion or transfer. The exact permissions are documented in [GitHub's role table](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization).

Before transfer, the existing access list and protections will be recorded. The new organization's base permissions will be configured so membership alone does not grant additional write access. Effective access will be checked after transfer against the agreed list.

## Later access changes

Adding or removing an owner or maintainer would require a public pull request open for 14 days and explicit support from at least two participating projects other than the project gaining or losing access. Silence would not count as support. Anyone could step down at any time.

An account whose access presents an immediate security risk could have that access suspended temporarily without waiting 14 days. The owner would record the reason publicly as soon as doing so is safe and open the normal review for the lasting decision. This exception would not authorize adding an owner or granting new access.

## Transfer checks

1. **Required checks.** `dco`, `scan` and `validate-trusted` are required on `main`. Their sources are `dco-check.yml`, `check-drift.yml` and `validate.yml`. The `scan` check is a GitHub Actions job, not an unidentified external app. Before transfer, record the protections and Actions permissions. After transfer, verify that all required checks run on a pull request and still gate merging. Do not remove a required check merely to make the transfer work.

2. **Apps and integrations.** Inventory the integrations actually used by the repository, confirm their access in the destination organization, and prepare any required installation or permission changes before transfer.

3. **The matrix site.** GitHub redirects repository URLs but does not redirect the associated Pages address. Prepare updates from `aeoess.github.io/agent-governance-vocabulary` to `nosai-federation.github.io/agent-governance-vocabulary` before transfer. Deploy and verify the new matrix site during the transfer, then update the README, generated documentation, generator and links on agent-passport.org as part of the same operation. [GitHub documents this limitation](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository).

4. **Repository links.** GitHub redirects repository and Git operation URLs. Update local remotes and published references over time. Do not recreate a repository at the old location, which would remove the redirect where GitHub permits that name to be reused.

5. **Configuration.** Recheck repository and environment secrets by name only, variables, webhooks, deploy keys, Pages settings and organization policies immediately before transfer. Preserve the required configuration and verify its effective behavior afterwards. Do not publish secret values in the inventory.

## If something breaks after transfer

Record the failed check and what it affects on #244. Restore the affected integration, permissions or deployment in the new organization, then rerun the transfer checks. Do not skip a required check or weaken branch protection to restore service.

If the repository cannot be repaired in place, record the available options on #244, including whether a transfer back to the user account is feasible and who can authorize it. A transfer back is not automatic: GitHub can retire the old name, and the same checks apply in the other direction.

Record the final state and any changed links on #244.

## Sequence

Once the review period and support condition are met, prepare the organization, access settings, integration checks and link changes. Transfer only when those preparations are complete.

After transfer, verify access, branch protection, required checks, repository redirects and the deployed matrix. Record the results on #244. If a prerequisite cannot be resolved, the transfer waits and the unresolved item is recorded there.
