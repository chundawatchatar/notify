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

## 2. Worktree And Branch

1. Create one dedicated worktree per ticket below `../notify-worktrees`.
2. Branch from the current local `develop` branch. Use a descriptive branch
   name such as `nfy-123-short-description` without a username.
3. Keep one ticket per branch, worktree, commit set, and pull request unless the
   requester explicitly groups tickets.
4. Do not start containers from a worktree because they duplicate the shared
   local service containers. Install dependencies only when the worktree does
   not already have them.
5. Preserve unrelated changes and never reuse or delete another ticket's
   worktree.

## 3. Implementation

1. Follow the repository implementation order in `AGENTS.md`.
2. Update documentation when the ticket changes behavior, architecture, API
   contracts, persistence, operations, or frontend conventions.
3. Regenerate route trees, OpenAPI output, and generated client types from
   their source definitions. Never edit generated files directly.
4. Add focused, risk-based coverage using the relevant backend or frontend
   test playbook.
5. Keep the Linear issue and requester informed about material blockers or
   scope decisions. Do not silently broaden the ticket.

## 4. Authorization Gates

The following actions require explicit requester authorization:

- running tests, application servers, containers, or browser checks;
- creating a commit or staging files for a requested commit;
- pushing a branch or opening a pull request;
- merging a pull request;
- changing Linear status, assignment, labels, or comments when the requester
  has not already asked for that update.

Authorizing a merge also authorizes the required post-merge Linear Done
transition and safe removal of the clean ticket worktree.

Read-only inspection, implementation edits, contract generation, formatting,
linting, and typechecking remain allowed when they are normal in-scope work and
do not start an application or test suite.

## 5. Verification And Handoff

1. Load `notify-verify-change` before reporting implementation completion.
2. Run only the smallest checks authorized and required for the changed
   projects.
3. Inspect `git status --short`, the final diff, generated-file drift, and
   `git diff --check`.
4. Report every check run, its result, and every required check that was not
   run because authorization was not provided.
5. Do not commit during implementation handoff unless the requester explicitly
   asks.

## 6. Commit And Pull Request

When authorized:

1. Stage only ticket-related files.
2. Create a single-line Angular Conventional Commit message without a trailing
   period.
3. Push the ticket branch and open a pull request targeting `develop`.
4. Use a clear pull request title and description that link the Linear issue,
   summarize the change, and list verification performed or skipped.
5. Add the pull request URL to Linear and move the issue to the appropriate
   review state when authorized.

## 7. Review, Merge, And Cleanup

1. Address actionable review feedback and rerun the affected authorized
   verification.
2. Merge only after explicit authorization, required approvals, resolved
   conversations, and required checks succeed.
3. Confirm the pull request actually merged before cleanup.
4. Move the Linear issue to Done.
5. Confirm the ticket worktree has no uncommitted changes, then remove that
   dedicated worktree from outside it. Never force-remove a dirty worktree.
