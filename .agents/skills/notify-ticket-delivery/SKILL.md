---
name: notify-ticket-delivery
description: Deliver assigned Notify Linear implementation tickets through readiness checks, isolated worktree setup, scoped implementation, verification, pull request review, merge, Linear completion, and worktree cleanup. Use when starting, resuming, implementing, publishing, reviewing, or completing a ticket identified by an issue key such as NFY-123.
---

# Notify Ticket Delivery

Read `docs/ticket-delivery.md` completely before taking ticket actions. Treat
that document as the canonical workflow and do not duplicate or override its
authorization gates here.

## Workflow

1. Read the issue, its relations, and required repository documents.
2. Confirm blocking issues are complete before implementation.
3. For a new ticket, refresh `develop` and create a new dedicated branch and
   worktree. Reuse a worktree only when resuming that same ticket.
4. Load the smallest task-specific playbooks from `.agents/skills/index.yaml`.
5. Implement only the ticket scope, preserve unrelated changes, and do not run
   tests during implementation.
6. After implementation is complete, load `notify-verify-change` and run the
   smallest required tests and checks in one final pre-commit phase.
7. When final verification passes, stage only ticket files, create one commit,
   push the branch, open a non-draft pull request targeting `develop`, link it
   in Linear, and move the issue to In Review under the start authorization.
8. Keep application, container, browser, merge, and post-merge actions behind
   their explicit authorization gates.
9. After an authorized merge, confirm it completed, move the Linear issue to
   Done, and safely remove the clean ticket worktree.
