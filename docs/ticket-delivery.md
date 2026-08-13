# Ticket Delivery

This document is the canonical workflow for delivering an assigned Linear
implementation ticket. Follow it unless the ticket or requester explicitly
changes the process. GitHub automation, branch protection, merge queues, and
release promotion are documented in `docs/github-workflow.md`.

## 1. Intake And Readiness

1. Read `AGENTS.md` and the complete Linear issue, including acceptance
   criteria, guardrails, linked documents, and issue relations.
2. Confirm every blocking issue is complete before implementation. Report a
   blocker instead of guessing contracts owned by unfinished dependencies.
3. Read `.agents/skills/index.yaml` and load `notify-ticket-delivery` followed
   by the smallest applicable implementation playbooks.
4. Inspect the current repository patterns and relevant documentation before
   editing. Keep the ticket scope separate from unrelated cleanup.
5. When readiness checks pass, a request to start the named implementation
   ticket authorizes moving it to In Progress and delivering it through a
   review-ready pull request under the gates below. A resume request preserves
   the ticket's current state and continues only from its first incomplete
   delivery step.

## 2. Worktree And Branch

1. Before creating a worktree, fast-forward the local `develop` branch from
   `origin/develop`. If the requester or ticket explicitly specifies another
   base, follow that instruction instead.
2. For every new ticket, create a new branch and dedicated worktree below
   `../notify-worktrees`. Never implement a new ticket on `develop` or another
   ticket's branch.
3. Branch from the refreshed local `develop` branch unless an explicit base was
   requested. Use a descriptive branch name such as
   `nfy-123-short-description` without a username.
4. Resume a ticket only in its existing dedicated branch and worktree. Keep one
   ticket per branch, worktree, commit set, and pull request unless the
   requester explicitly groups tickets.
5. Before changing a resumed ticket, inspect its worktree and branch, local and
   remote commits, pull request for the head branch, and Linear status and
   links. Reuse every existing artifact and do not regress its delivery state.
6. Do not start containers from a worktree because they duplicate the shared
   local service containers. Install dependencies only when the worktree does
   not already have them.
7. Preserve unrelated changes and never reuse or delete another ticket's
   worktree.

## 3. Implementation

1. Follow the repository implementation order in `AGENTS.md`.
2. Update documentation when the ticket changes behavior, architecture, API
   contracts, persistence, operations, or frontend conventions.
3. Regenerate route trees, OpenAPI output, and generated client types from
   their source definitions. Never edit generated files directly.
4. Add focused, risk-based coverage using the relevant backend or frontend
   test playbook, but do not run test suites during implementation.
5. Keep the Linear issue and requester informed about material blockers or
   scope decisions. Do not silently broaden the ticket.

## 4. Authorization Gates

The following actions require explicit requester authorization:

- running application servers, containers, or browser checks;
- staging, committing, pushing, or opening a pull request outside a started
  implementation-ticket workflow;
- merging a pull request;
- changing Linear status, assignment, labels, or comments when the requester
  has not already asked for that update.

Milestone requests carry the following scoped authorization:

- asking to start a named implementation ticket authorizes moving it to In
  Progress, running the smallest relevant tests after implementation, staging
  only ticket files, creating task-scoped commits, pushing its branch, opening
  a non-draft pull request, linking it in Linear, and moving it to In Review;
- asking to resume that ticket grants the same scoped authority only for
  incomplete or newly necessary steps and preserves all completed publication
  state;
- authorizing a merge also authorizes the required post-merge Linear Done
  transition and safe removal of the clean ticket worktree.

The implementation-ticket authorization does not permit applications,
containers, browser checks, merging, or post-merge cleanup. If final
verification fails, stop before staging, committing, pushing, or opening the
pull request. Fix the scoped issue and rerun only the affected final checks.

Authorization is stage-aware and does not make resume steps unconditional.
After inspecting current state, perform only incomplete or newly necessary
steps. Do not create an empty or redundant commit, push an unchanged branch,
open a duplicate pull request, add a duplicate Linear link, move an In Review
ticket back to In Progress, or repeat an already-completed status transition.
Review feedback on an open pull request normally requires only the affected
verification, a corrective commit, and a push to the existing branch.

Read-only inspection, implementation edits, contract generation, formatting,
linting, and typechecking remain allowed when they are normal in-scope work and
do not start an application or test suite.

## 5. Verification And Handoff

1. Finish implementation before starting verification. Do not interleave test
   runs with implementation work.
2. Load `notify-verify-change`, then run the smallest required tests and checks
   in one final phase before staging, committing, or pushing.
3. Inspect `git status --short`, the final diff, generated-file drift, and
   `git diff --check`.
4. Report every final check run, its result, and every required check that was not
   run because authorization was not provided.
5. Continue to commit and publish only when every required final check passes.

## 6. Commit And Pull Request

After final verification passes:

1. Inspect the current publication state and run only the steps not already
   complete or made necessary by new changes.
2. When uncommitted ticket changes exist, stage only those files and create a
   single-line Angular Conventional Commit message without a trailing period.
3. When local ticket commits are not on the remote, push the existing ticket
   branch.
4. When the ticket branch has no pull request, open a non-draft pull request
   targeting `develop` so it is immediately ready for review. Otherwise update
   and reuse the existing pull request.
5. Title each pull request as `[NFY-123] Exact Linear issue title`. Do not use
   a commit-style title. Keep its description short: link the Linear issue,
   summarize the change, and list final verification performed or not
   applicable.
6. Write multiline pull request descriptions through a body file or standard
   input with real line breaks. Read the saved body back after every create or
   edit and reject literal `\n` sequences or truncated content.
7. Read the pull request back to confirm it is open, non-draft, targets
   `develop`, and contains the complete description.
8. Add the pull request URL to Linear only when it is not already linked. Move
   the issue to In Review only when it has not already reached that state.

## 7. Review, Merge, And Cleanup

1. Address actionable review feedback and rerun the affected authorized
   verification.
2. Merge only after explicit authorization, required approvals, resolved
   conversations, and required checks succeed.
3. Confirm the pull request actually merged before cleanup.
4. Move the Linear issue to Done under the merge authorization.
5. Under the same authorization, confirm the ticket worktree has no uncommitted
   changes, then remove that dedicated worktree from outside it. Never
   force-remove a dirty worktree.
