# WARP - Architecture Documentation

## Overview

Angular 20 scaffolding with SSR and BFF architecture for nCompass TV projects.

## Project Structure

```
src/
├── app/
│   ├── core/              # Infrastructure (guards, services, models)
│   ├── features/          # Business features (dashboard, etc.)
│   ├── layout/            # Layout shells (authenticated, public)
│   └── shared/            # Reusable components, directives, pipes
│
└── server/                # BFF Layer
    ├── config/            # Environment configuration
    ├── middleware/        # Express middleware (origin validation)
    ├── services/          # HTTP client for backend proxy
    └── types/             # TypeScript type definitions
```

## Path Aliases

```typescript
import { AuthService, authGuard, guestGuard } from '@core';
import { DashboardComponent } from '@features/dashboard';
import { MyComponent } from '@shared/components';
import { PublicComponent } from '@layouts/public';
```

## Import Organization

Imports must be organized in groups with section comments:

```typescript
/** Angular Imports */
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Third Party Imports */
import axios from 'axios';
import express from 'express';

/** Local Imports */
import { AuthService } from '@core';
import { DashboardComponent } from '@features/dashboard';
```

**Rules:**

- Group imports by source (Angular, Third Party, Local)
- Add section comments: `/** Angular Imports */`, `/** Third Party Imports */`, `/** Local Imports */`
- Use path aliases for local imports (`@core`, `@features`, etc.)
- For server files, use `.js` extension: `import { service } from './service.js';`

## BFF Architecture

```
Browser → SSR Server (BFF) → Backend API
```

**Benefits:**

- ✅ Hides backend URLs from browser
- ✅ Centralized security & validation
- ✅ SSR-safe authentication

## Authentication

- **AuthService**: Manages auth state with Angular signals
- **authGuard**: Protects authenticated routes
- **guestGuard**: Protects public routes
- **SSR-safe**: Uses `isPlatformBrowser()` checks

## Adding Features

1. Create in `features/your-feature/`
2. Add routes in `layout/*/routes.ts`
3. Use path aliases for imports
4. Export via `index.ts` barrel

---

**Maintained by:** N-Compass TV Development Team
