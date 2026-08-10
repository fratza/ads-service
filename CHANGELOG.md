# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-05-14

### Added

- **BFF Layer - MVC Architecture Implementation**
  - Created complete Routes → Controllers → Services architecture
  - Added `src/server/routes/` directory with example resource routes
  - Added `src/server/controllers/` directory with example resource controller
  - Added `src/server/services/resource.service.ts` with business logic implementation
  - Added `src/server/types/database.types.ts` for database type definitions
  - Added barrel exports (`index.ts`) in all server directories:
    - `routes/index.ts`
    - `controllers/index.ts`
    - `services/index.ts`
    - `middleware/index.ts`
    - `types/index.ts`
  - Integrated BFF routes into `src/server.ts` with proper middleware
  - Added strict TypeScript typing for all route handlers (Request, Response types)

- **Documentation**
  - Created `docs/BFF-ARCHITECTURE.md` - Complete MVC architecture guide
  - Created `docs/BFF-IMPLEMENTATION-EXAMPLE.md` - Implementation examples and patterns
  - Updated directory structure diagrams to include barrel exports

### Changed

- Updated `src/server.ts` to register BFF routes before generic proxy handler
- Enhanced type safety across routing layer with explicit Request/Response types
- Added `engines` field to `package.json` requiring Node.js >=20.0.0 and npm >=10.0.0
- Verified `engine-strict=true` in `.npmrc` for strict version enforcement

## [1.1.0] - Previous Release

Initial scaffolding with SSR and basic BFF proxy configuration.
