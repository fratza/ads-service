# Angular Development Rules for This Repo

This document defines the Angular development standard for `aws-cost-usage-monitor` based on the current repository state. When documentation and implementation differ, **the repo implementation is the source of truth**.

## 1. Core Principles

- Follow the existing repo structure, naming, and Angular patterns before introducing new ones.
- Make the smallest safe change possible.
- Prefer consistency with nearby code over generic Angular best practices.
- Keep this file updated when repo standards intentionally change.

## 2. Current Stack and Runtime Expectations

- Angular **21** app using **standalone components** and `bootstrapApplication()`.
- **SSR enabled** with an Angular server entry and a BFF-style server under `src/server`.
- **Zoneless change detection** is enabled via `provideZonelessChangeDetection()`.
- Styling uses **SCSS** and **Tailwind CSS** together.
- TypeScript runs in **strict mode**.

## 3. Source of Truth Files

Use these files first when deciding how to implement work:

- `package.json`
- `angular.json`
- `tsconfig.json`
- `src/app/app.config.ts`
- `src/app/app.routes.ts`
- `src/app/**` existing feature patterns
- `src/server/**` existing SSR/BFF patterns
- `docs/WARP.md`
- `docs/STANDARDS.md` (only where it matches the actual codebase)
- `docs/design.md` for visual consistency, theming, and Component Pantry usage

## 4. App Architecture

Use the current folder responsibilities:

- `src/app/core` → singleton services, guards, interceptors, models
- `src/app/shared` → reusable shared UI, directives, pipes
- `src/app/features` → feature screens/components
- `src/app/layout` → layout-level route groupings
- `src/server` → SSR/BFF server code

BFF extension rule:
- Add new backend capabilities as focused route/service files under `src/server/routes/` and `src/server/services/` when the feature becomes real.
- Do not keep generic proxy or placeholder server layers “for later.”

### Feature placement rules

- Put app-wide logic in `core`.
- Put reusable presentation pieces in `shared`.
- Put route-driven business UI in `features`.
- Put route grouping/layout concerns in `layout`.
- Do not create NgModules unless the repo adopts them later; current standard is standalone-first.

## 5. Angular Coding Rules

### Components

- Prefer **standalone components**.
- Use `templateUrl` and `styleUrl` file separation, matching existing components.
- Keep component APIs typed.
- Use explicit method return types.
- Avoid unnecessary constructor injection; current code often uses `inject()`.

### Routing

- Keep routes typed as `Routes`.
- Follow existing route files such as:
  - `src/app/app.routes.ts`
  - `src/app/layout/authenticated/authenticated.routes.ts`
  - `src/app/layout/public/public.routes.ts`
- Prefer lazy loading for new route-driven features when it fits the existing route structure.
- Use guards from `core/guards` for auth-related access control.

### State and reactivity

- Prefer Angular-native primitives already used in the repo, especially **signals**.
- Ensure SSR-safe/browser-only logic uses platform checks where needed.

### SSR safety

- Do not access browser-only APIs (`window`, `document`, `localStorage`, `sessionStorage`) without SSR-safe guards.
- Follow the `AuthService` pattern using `isPlatformBrowser()` for browser-only storage access.

## 6. Imports and Boundaries

### Import grouping

Follow the repo’s import grouping where used:

```ts
/** Angular Imports */
import { Component } from '@angular/core';

/** Third Party Imports */
import { Button } from '@ntv360/component-pantry';

/** Local Imports */
import { AuthService } from '@core';
```

### Path aliases

Prefer aliases from `tsconfig.json` for app code:

- `@core`
- `@features`
- `@layouts`
- `@shared`

Rules:

- Prefer aliases over deep relative imports in `src/app`.
- Barrel exports (`index.ts`) are part of the repo convention; update them when adding public items.
- Server-side local imports should follow the existing `.js` extension pattern in TS source where required by the SSR/server setup.

## 7. Styling Rules

- Use **`.scss`** for component and global styles.
- Tailwind is available and already used in templates.
- Because the current repo uses inline Tailwind utility classes in templates, this is allowed.
- For repeated or complex styling, prefer moving styles into SCSS and using semantic class names.
- Reuse the theme tokens/colors already defined in `tailwind.config.js`.
- Follow `docs/design.md` for app-wide visual consistency, brand direction, and Component Pantry-first UI decisions.

### BEM usage

- `docs/STANDARDS.md` recommends BEM.
- The current implementation does **not** consistently enforce BEM.
- Therefore, for this repo:
  - Use clear, semantic class names.
  - Prefer BEM for new complex/component-scoped styling.
  - Do not refactor existing template utility classes to BEM unless requested.

## 8. TypeScript Rules

- Preserve `strict` compatibility.
- Avoid `any`; prefer exact types or `unknown`.
- Add explicit return types for public functions/methods.
- Do not weaken compiler settings to make code pass.
- Keep APIs and event handlers typed.

## 9. Documentation and Comments

- Add JSDoc where the surrounding codebase already expects it, especially for:
  - services
  - guards
  - shared utilities
  - non-trivial public methods
- Do not add noisy comments for obvious code.
- Prefer high-value documentation over comment volume.

## 10. Testing and Validation

After changes, run the smallest useful validation step:

- `npm test` for test-related changes
- `npm run build` for integration/SSR-sensitive changes
- targeted validation when only a small area changed

Also:

- Keep tests aligned with current behavior.
- If you change routes, component APIs, or rendered text, update affected specs.

## 11. Commits and Formatting

- Format with the repo’s Prettier setup when needed.
- Supported commit types are defined in `commitlint.config.js`:
  - `feat`
  - `feature`
  - `fix`
  - `chore`

Commit format:

```text
<type>: <subject>
```

## 12. What to Avoid

- Do not introduce NgModule-based patterns as the default.
- Do not bypass SSR safety checks.
- Do not introduce new architectural layers unless the existing structure cannot support the task.
- Do not replace aliases with long relative imports.
- Do not enforce generic Angular style-guide rules when this repo already uses a different working pattern.
- Do not perform broad refactors just to “standardize” old code unless requested.

## 13. Working Rule for Future Tasks

For every Angular task in this repo:

1. Check nearby files first.
2. Match the existing folder, routing, import, and standalone component pattern.
3. Keep SSR and zoneless compatibility intact.
4. Use aliases and barrel exports consistently.
5. Validate with the smallest useful command.

If a requested change conflicts with this document, the **current repo implementation wins**, unless the user explicitly wants the standard changed.
