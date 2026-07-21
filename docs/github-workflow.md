# GitHub Workflow Plan

This document describes the GitHub workflow planned for after the MVP is ready.
No GitHub Actions workflow files are committed during the current product and
architecture phase. Until CI is enabled, contributors run the repository's
verification commands locally when preparing changes.

Repository and environment settings such as branch protection, approvals,
registries, and Kubernetes credentials must be configured in GitHub before the
planned workflows can be enabled.

The shape is inspired by mature release automation patterns: PR checks,
protected integration branches, release tracking issues, release blockers,
staging promotion, production approval, incident handling, hotfixes, and
merge-back cleanup. The details below are tailored to Notify's current stack.

## Goals

- Keep `develop` as the latest shared development branch.
- Protect `develop` and `main` from direct pushes.
- Run fast affected checks on normal PRs.
- Re-run required checks in the merge queue before code enters `develop`.
- Cut release branches from `develop` and deploy those branches to staging.
- Run the full validation suite on release PRs into `main`.
- Promote only a green release candidate to production.
- Drive release, blocker, hotfix, and incident state through GitHub issues.
- Automatically close tracking issues when all release steps are complete.
- Merge production changes back into `develop` after release or hotfix.

## Branch Model

- `develop`: latest integrated development code. Developers branch from here.
- `main`: production source of truth. Production tags are created from here.
- `feature/*`: normal feature branches opened as PRs into `develop`.
- `release-YYYYMMDD.N`: release candidate branches cut from `develop`.
- `hotfix-YYYYMMDD.N`: emergency branches cut from `main`.

The release number is per day. For example:

- first release cut on June 9, 2026: `release-20260609.1`
- second release cut on June 9, 2026: `release-20260609.2`
- first hotfix on June 9, 2026: `hotfix-20260609.1`

Production tags should use `vYYYYMMDD.N`, for example `v20260609.1`.

## Ticket Delivery

Assigned Linear implementation tickets follow the canonical
[ticket delivery workflow](ticket-delivery.md). This document owns the
GitHub-specific branch protection, pull-request checks, merge-queue, release,
hotfix, and automation policies.

## Normal PR Flow

Trigger: `pull_request` targeting `develop`.

Normal PRs should run affected checks wherever possible so feedback is fast:

- run lint
- run typecheck
- run tests
- run builds

Start with the full checks for reliability. Move these jobs to Nx affected
commands when repository size makes the full suite too slow in CI.

Required PR rules:

- PR targets `develop`.
- At least one approval is required.
- Code owner approval is required once `CODEOWNERS` exists.
- All conversations must be resolved.
- Draft PRs cannot merge.
- Direct pushes to `develop` are disabled.
- Merge is blocked by any of these labels:
  - `do-not-merge`
  - `release-blocker`
  - `incident-active`

Recommended workflow files:

- `.github/workflows/pr-checks.yml`
- `.github/workflows/merge-guard.yml`
- `.github/CODEOWNERS`
- `.github/pull_request_template.md`

## Merge Queue To Develop

After approval, clicking the merge button should put the PR into GitHub merge
queue for `develop`.

The merge queue must run the same required checks as the PR, against the exact
merge candidate commit GitHub is about to land. This protects `develop` from
passing PRs that fail once combined with other queued work.

Important requirements:

- Merge queue checks must run for `merge_group`.
- Required checks must report real success or failure in both PR and merge queue
  contexts.
- Avoid required checks that are skipped in merge queue context.
- If a check should not do work in merge queue, provide a deliberate lightweight
  success job with the same required check name.

Recommended workflow file:

- `.github/workflows/merge-queue.yml`

## Release Cut

Trigger: manual workflow dispatch or GitHub issue template.

Inputs:

- source branch, default `develop`
- release type, normally `release`
- optional release notes

Expected behavior:

1. Determine the next release branch name for the day:
   `release-YYYYMMDD.N`.
2. Create the release branch from `develop`.
3. Create a release tracking issue.
4. Apply labels:
   - `release`
   - `release/vYYYYMMDD.N`
5. Open a release PR from `release-YYYYMMDD.N` into `main`.
6. Trigger staging deployment for the release branch.
7. Add links for release branch, release PR, staging deployment, and workflow
   runs to the issue body.

Release tracking issue checklist:

- [ ] Release branch created
- [ ] Release PR opened into `main`
- [ ] Staging deployment started
- [ ] Staging smoke tests passed
- [ ] Staging integration tests passed
- [ ] Release PR full suite passed
- [ ] No open release blockers
- [ ] Production approval received
- [ ] Production deployment completed
- [ ] Production smoke tests passed
- [ ] Production tag and GitHub release created
- [ ] Merge-back PR opened
- [ ] Merge-back PR merged into `develop`

The issue should be updated automatically after every workflow phase. It should
close automatically only after production succeeds and merge-back is complete.

Recommended workflow files:

- `.github/workflows/release-cut.yml`
- `.github/ISSUE_TEMPLATE/release.yml`

## Staging Deployment

Trigger: push to branches matching `release-*` or `hotfix-*`.

The staging deployment workflow should run whenever a release or hotfix branch
is created or updated. This means a release fix pushed to the release branch
automatically refreshes staging.

Expected behavior:

- build deployable artifacts from the release branch commit
- tag artifacts with:
  - full SHA
  - short SHA
  - release candidate tag, for example `v20260609.1-rc`
- deploy API and web to staging
- create/update a GitHub deployment for the `staging` environment
- update the release tracking issue with deployment progress
- run staging smoke checks:
  - `GET /api/health/ready`
  - `GET /api/version`
  - web app responds successfully

Staging deploys should not require manual approval. They are the proving ground
for the release candidate.

Recommended workflow file:

- `.github/workflows/deploy-staging.yml`

## Staging Integration Tests

Trigger: successful staging deployment.

After staging is deployed, run browser/API integration tests against the staging
environment. Playwright is a good first choice for browser coverage because it
is open source, CI-friendly, and can test API-backed user flows later.

Initial test scope:

- API health endpoint responds on staging
- API version endpoint responds on staging
- web app loads
- core unauthenticated pages render

Future test scope:

- signup/login
- subscription flows
- notification template creation
- notification delivery preview

The release PR must not be mergeable to `main` until staging integration tests
pass. If integration tests fail, the workflow should:

- mark the release tracking issue as blocked
- create or update a release blocker issue
- link failing workflow logs
- identify suspected owners when possible using touched files or CODEOWNERS
- notify the release/blocker Slack channel when configured

Recommended workflow files:

- `.github/workflows/staging-integration-tests.yml`
- `.github/workflows/release-blocker-check.yml`

## Release PR To Main

Trigger: release PR opened from `release-*` to `main`.

Unlike normal feature PRs, release PRs must run the full suite, not only
affected checks:

- `pnpm format:all:check`
- `pnpm lint:all`
- `pnpm typecheck:all`
- `pnpm test`
- `pnpm build`
- API tests with PostgreSQL
- Docker Compose validation
- staging integration test status check
- release blocker check

Required PR rules:

- At least one approval from a release approver.
- No open blocker labels for this release.
- Staging deployment is current for the release branch head SHA.
- Staging integration tests passed for the same SHA.
- The release tracking issue checklist is green through staging.

Recommended workflow file:

- `.github/workflows/release-pr-checks.yml`

## Release Blockers

A release blocker is an issue or PR that prevents production promotion.

Labels:

- `release-blocker`: blocks all releases
- `release-blocker/vYYYYMMDD.N`: blocks a specific release
- `owner-needed`: no responsible owner is assigned yet

When release validation fails, automation should create or update a release
blocker issue with:

- release version
- failing stage
- failing workflow link
- suspected owner or owning area
- required fix
- release tracking issue link

When Slack is configured, post blocker updates to a dedicated release blocker
channel. The notification should include responsible developers or teams when
known.

The release process repeats until:

- the fix is merged into the release branch
- staging redeploys
- integration tests pass
- release PR full suite passes
- blocker issue is closed or marked out of scope

Production deployment must fail early while matching blocker issues remain open.

Recommended workflow file:

- `.github/workflows/release-blocker-check.yml`

## Production Deployment

Trigger: merge of a release PR into `main`.

Production deployment should not rebuild a different artifact if avoidable. The
preferred model is to promote the exact artifact that passed staging. If the
deployment platform does not support promotion yet, the workflow must rebuild
from the exact `main` SHA and prove the artifact identity clearly.

Required gates:

- release PR merged into `main`
- full release PR suite passed
- staging deployment passed for the release SHA
- staging integration tests passed for the release SHA
- no matching release blockers are open
- GitHub `production` environment approval completed
- migration risk acknowledged

Expected behavior:

1. Create/update GitHub deployment for `production`.
2. Deploy API and web to production.
3. Run production smoke checks:
   - `GET /api/health/ready`
   - `GET /api/version`
   - web app responds successfully
4. Tag the production commit as `vYYYYMMDD.N`.
5. Create a GitHub release with generated notes.
6. Update the release tracking issue.
7. Trigger merge-back into `develop`.

Recommended workflow file:

- `.github/workflows/deploy-production.yml`

Production should use GitHub Environments with required reviewers and
environment-scoped secrets.

## Merge Back After Release

Trigger: successful production deployment.

The release branch may contain fixes added after it was cut from `develop`.
Those fixes must flow back into `develop`.

Expected behavior:

1. Open a merge-back PR from `main` to `develop`.
2. Label it with:
   - `release`
   - `merge-back`
   - `release/vYYYYMMDD.N`
3. Run normal PR checks or a full suite if the release had late fixes.
4. Merge through the `develop` merge queue.
5. Delete the release branch after merge-back.
6. Close the release tracking issue automatically.

If merge-back has conflicts, the tracking issue remains open and is assigned to
the release owner.

Recommended workflow file:

- `.github/workflows/release-merge-back.yml`

## Incident Workflow

Trigger: manual workflow dispatch or incident issue template.

Use incident issues for production-impacting events after deployment.

Incident issue fields:

- severity: `sev1`, `sev2`, `sev3`
- affected environment
- start time
- customer impact
- suspected service
- incident commander
- communication owner
- linked release or production tag

Expected behavior:

- create incident issue
- apply labels:
  - `incident`
  - severity label
  - `incident-active`
- notify the incident Slack channel when configured
- block unrelated production deploys while `incident-active` is open
- optionally start hotfix flow from the incident issue
- close with resolution summary and follow-up checklist

Recommended workflow files:

- `.github/workflows/incident-create.yml`
- `.github/ISSUE_TEMPLATE/incident.yml`

## Hotfix Workflow

Hotfixes are release-like, but they start from `main`, not `develop`.

Trigger: manual workflow dispatch or incident issue action.

Flow:

1. Create incident or hotfix tracking issue.
2. Cut `hotfix-YYYYMMDD.N` from `main`.
3. Open hotfix PR from `hotfix-YYYYMMDD.N` into `main`.
4. Run full PR suite.
5. Deploy hotfix branch to staging.
6. Run staging smoke and integration tests.
7. Require production approval.
8. Merge hotfix PR into `main`.
9. Deploy production.
10. Tag as `vYYYYMMDD.N`.
11. Open merge-back PR from `main` to `develop`.
12. Close hotfix and incident issues after production and merge-back complete.

Hotfixes should bypass normal release batching but not bypass required checks.
If an emergency requires skipping a gate, the workflow should require explicit
manual approval and leave a permanent note on the incident issue.

Recommended workflow files:

- `.github/workflows/hotfix-cut.yml`
- `.github/ISSUE_TEMPLATE/hotfix.yml`

## Issue-Driven State Machine

Release, hotfix, blocker, and incident workflows should be issue-driven. The
issue is the durable record that links humans, workflow runs, PRs, deployments,
and follow-up tasks.

Release issue states:

- `created`: release issue opened
- `branch-created`: release branch exists
- `staging-deploying`: staging deploy started
- `staging-testing`: integration tests running
- `blocked`: blocker issue open
- `ready-for-prod`: all staging and release PR gates passed
- `prod-deploying`: production deployment started
- `prod-deployed`: production smoke checks passed
- `merge-back-open`: merge-back PR opened
- `complete`: merge-back merged and issue closed

The workflow can represent these states with labels, issue comments, or a
checked task list. Labels are easier for automation to query; task lists are
easier for humans to scan. We should use both sparingly.

Recommended labels:

- `release`
- `hotfix`
- `merge-back`
- `release-blocker`
- `incident`
- `incident-active`
- `do-not-merge`
- `owner-needed`
- `ready-for-prod`
- `sev1`
- `sev2`
- `sev3`

## GitHub Repository Settings

Branch protection for `develop`:

- require PR before merge
- require at least one approval
- require status checks
- require merge queue
- require conversation resolution
- disallow force pushes
- disallow branch deletion
- disallow direct pushes

Branch protection for `main`:

- require PR before merge
- allow only release/hotfix PRs into `main`
- require release PR full suite
- require staging deployment status
- require staging integration test status
- require release blocker check
- require production approval through GitHub Environment before deployment
- disallow force pushes
- disallow branch deletion
- disallow direct pushes

GitHub environments:

- `staging`
  - no manual approval required
  - environment URL set after deployment
  - deployment branch restriction to `release-*` and `hotfix-*`
- `production`
  - required reviewers
  - environment-scoped secrets only
  - deployment branch restriction to `main`

## Recommended Workflow Files

- `.github/workflows/pr-checks.yml`
- `.github/workflows/merge-queue.yml`
- `.github/workflows/merge-guard.yml`
- `.github/workflows/release-cut.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/staging-integration-tests.yml`
- `.github/workflows/release-pr-checks.yml`
- `.github/workflows/release-blocker-check.yml`
- `.github/workflows/deploy-production.yml`
- `.github/workflows/release-merge-back.yml`
- `.github/workflows/incident-create.yml`
- `.github/workflows/hotfix-cut.yml`

Recommended templates/config:

- `.github/CODEOWNERS`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/release.yml`
- `.github/ISSUE_TEMPLATE/hotfix.yml`
- `.github/ISSUE_TEMPLATE/incident.yml`

## First Implementation Order

1. Add branch protection plan and labels.
2. Add PR affected checks for `develop`.
3. Add merge queue checks for `develop`.
4. Add release cut issue and branch automation.
5. Add staging deployment for `release-*` and `hotfix-*`.
6. Add staging smoke and Playwright integration tests.
7. Add release PR full-suite checks into `main`.
8. Add release blocker issue automation.
9. Add production deployment with GitHub Environment approval.
10. Add merge-back automation from `main` to `develop`.
11. Add incident and hotfix workflows.

This order gives us useful CI first, then staging safety, then production
automation, without overbuilding the release system before deployment targets
are finalized.
