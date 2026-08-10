# BFF Architecture Implementation Example

This document provides a complete example of the BFF (Backend-for-Frontend) architecture as implemented in this project.

## Directory Structure

```
src/server/
├── config/
│   └── environment.config.ts          # Environment configuration
│
├── routes/
│   ├── index.ts                       # Barrel export for routes
│   └── resource.routes.ts             # Example resource routes
│
├── controllers/
│   ├── index.ts                       # Barrel export for controllers
│   └── resource.controller.ts         # Example resource controller
│
├── services/
│   ├── index.ts                       # Barrel export for services
│   ├── http-client.service.ts         # Generic HTTP client
│   └── resource.service.ts            # Example resource service
│
├── middleware/
│   └── origin.middleware.ts           # Origin validation middleware
│
└── types/
    ├── index.ts                       # Barrel export for types
    ├── api.types.ts                   # API type definitions
    └── database.types.ts              # Database type definitions
```

## Implementation Flow

### 1. Routes Layer (`resource.routes.ts`)

**Purpose:** Define API endpoints and bind them to controller methods.

```typescript
/** Third Party Imports */
import express, { Router } from 'express';

/** Local Imports */
import { resourceController } from '../controllers/resource.controller.js';

const router: Router = express.Router();

router.get('/', (req, res) => resourceController.getAll(req, res));
router.get('/:id', (req, res) => resourceController.getById(req, res));
router.post('/', (req, res) => resourceController.create(req, res));
router.patch('/:id', (req, res) => resourceController.update(req, res));
router.delete('/:id', (req, res) => resourceController.delete(req, res));

export default router;
```

**Key Points:**
- Only defines endpoints
- No business logic
- Delegates to controllers

### 2. Controllers Layer (`resource.controller.ts`)

**Purpose:** Handle HTTP requests/responses and format output.

```typescript
/** Third Party Imports */
import { Request, Response } from 'express';

/** Local Imports */
import { ResourceService } from '../services/resource.service.js';

export class ResourceController {
    private readonly resourceService: ResourceService;

    constructor() {
        this.resourceService = new ResourceService();
    }

    async getAll(req: Request, res: Response): Promise<void> {
        try {
            // Parse query parameters
            const limit = parseInt((req.query.limit as string) || '100', 10);
            const offset = parseInt((req.query.offset as string) || '0', 10);

            // Call service
            const resources = await this.resourceService.getAll({ limit, offset });

            // Format response
            res.json({
                data: resources,
                meta: { limit, offset, count: resources.length },
            });
        } catch (error) {
            res.status(500).json({
                error: 'fetch_failed',
                errorDescription: 'Failed to fetch resources',
            });
        }
    }
}

export const resourceController = new ResourceController();
```

**Key Points:**
- Parses request parameters
- Calls service methods
- Formats JSON responses
- Handles HTTP status codes
- No business logic

### 3. Services Layer (`resource.service.ts`)

**Purpose:** Implement business logic and data operations.

```typescript
/** Local Imports */
import { httpClient } from './http-client.service.js';

export class ResourceService {
    async getAll(options: GetAllOptions): Promise<Resource[]> {
        // Build query parameters
        const params = new URLSearchParams({
            limit: options.limit?.toString() || '100',
            offset: options.offset?.toString() || '0',
        });

        // Fetch from backend API
        const response = await httpClient.get<{ data: Resource[] }>(
            `/api/resources?${params.toString()}`
        );

        return response.data;
    }

    private validateResourceData(data: Partial<Resource>): Partial<Resource> {
        if (!data.name || data.name.trim().length === 0) {
            throw new Error('Resource name is required');
        }
        return { ...data, name: data.name.trim() };
    }
}
```

**Key Points:**
- Contains business logic
- Validates data
- Calls backend APIs via httpClient
- No HTTP concerns (no Request/Response)

## Registration in Server

In `src/server.ts`:

```typescript
/** BFF Imports */
import { resourceRoutes } from './server/routes/index.js';

/**
 * BFF API Routes - MVC Pattern
 * Register specific routes before the generic proxy
 */
app.use('/api/resources', validateOrigin, resourceRoutes);
```

## API Endpoints

With the example implementation, the following endpoints are available:

- `GET /api/resources` - Fetch all resources
- `GET /api/resources/:id` - Fetch single resource
- `POST /api/resources` - Create new resource
- `PATCH /api/resources/:id` - Update resource
- `DELETE /api/resources/:id` - Delete resource

## Error Response Format

All errors follow this format:

```json
{
  "error": "error_code",
  "errorDescription": "Human readable message"
}
```

## Adding New Resources

To add a new resource (e.g., "users"):

1. **Create service:** `services/user.service.ts`
2. **Create controller:** `controllers/user.controller.ts`
3. **Create routes:** `routes/user.routes.ts`
4. **Export in barrel files:** Update `index.ts` in each directory
5. **Register in server:** Add to `src/server.ts`

```typescript
// In server.ts
import { userRoutes } from './server/routes/index.js';
app.use('/api/users', validateOrigin, userRoutes);
```

## Key Principles

✅ **Separation of Concerns:**
- Routes → Define endpoints
- Controllers → Handle HTTP
- Services → Business logic

✅ **Import Organization:**
```typescript
/** Node Imports */
/** Third Party Imports */
/** Local Imports */
```

✅ **File Extensions:**
- Always use `.js` extension for imports in server files

✅ **Barrel Exports:**
- Each directory has `index.ts` for clean imports

✅ **No Layer Skipping:**
- Always follow: Routes → Controllers → Services → API/Database

---

**Maintained by:** N-Compass TV Development Team
