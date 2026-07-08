# Configure Pre-Commit Hook

Set up pre-commit and pre-push hooks to make sure committed and pushed changes
are correct.

## Implementation

- Use native Git hooks with a repo-owned hooks directory.
- Add a pre-commit hook for formatting and lint checks on staged files.
- Add a pre-push hook for type safety and repository validation.
- Cover formatting, linting, and type safety.
- Add any other lightweight safety checks that fit the repo.

## Status

Implemented.
