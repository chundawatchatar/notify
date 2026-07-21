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
3. Create or reuse only the ticket's dedicated worktree and branch.
4. Load the smallest task-specific playbooks from `.agents/skills/index.yaml`.
5. Implement only the ticket scope and preserve unrelated changes.
6. Load `notify-verify-change` before handoff, committing, or publishing.
7. Obey the explicit authorization gates for tests, commits, publishing,
   merging, and Linear mutations.
8. After an authorized merge, confirm it completed, move the Linear issue to
   Done, and safely remove the clean ticket worktree.
