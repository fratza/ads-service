# ng-scaffolding

Angular 20 scaffolding with SSR + BFF architecture.

## Quick Start

```bash
npm install
npm run build
npm run serve:ssr:ng-scaffolding
```

```

## Path Aliases

-   `@core` - Services, guards, models
-   `@features/*` - Feature modules
-   `@shared/*` - Shared components
-   `@layouts/*` - Layout shells

## Commit Message Format

This project uses [Commitlint](https://commitlint.js.org/) with conventional commits. Pre-commit hooks will automatically validate your commit messages.

### Valid Commit Types

-   `feat` - New feature
-   `feature` - New feature (alias)
-   `fix` - Bug fix
-   `chore` - Build, tooling, or maintenance

### Format

```

<type>: <subject>

````

### Examples

```bash
feat: Add user authentication
feature: Implement dashboard page
fix: Resolve navigation bug
chore: Update dependencies
````

### Rules

- Type must be one of the valid types listed above
- Subject must use sentence case (capitalize first letter)
- Subject is required

The pre-commit hook will reject commits that don't follow these rules.

See [WARP.md](./WARP.md) for architecture details.

## Advertisement ingestion

Advertisement requests can be submitted by the intake form, imported from CSV/JSON, or
created by a trusted API integration. See
[docs/INPUT-INGESTION.md](./docs/INPUT-INGESTION.md) for payloads, authentication, import
formats, validation fallback, and idempotency behavior.
