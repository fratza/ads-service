# BFF Layer - MVC Architecture Guide

## Overview

The Backend-for-Frontend (BFF) layer follows an **MVC-style architecture** with clear separation of concerns:

- **Routes** → Define API endpoints
- **Controllers** → Handle HTTP requests/responses
- **Services** → Business logic and data operations

## Directory Structure

```
src/server/
├── config/                 # Environment configuration
│   └── environment.config.ts
│
├── routes/                 # API endpoint definitions
│   ├── index.ts
│   └── resource.routes.ts
│
├── controllers/            # Request/response handlers
│   ├── index.ts
│   └── resource.controller.ts
│
├── services/               # Business logic layer
│   ├── index.ts
│   ├── resource.service.ts
│   ├── supabase-client.service.ts
│   └── mapper.service.ts
│
├── middleware/             # Express middleware
│   ├── index.ts
│   └── origin.middleware.ts
│
└── types/                  # TypeScript definitions
    ├── index.ts
    ├── api.types.ts
    └── database.types.ts
```

## Layer Responsibilities

### 1. Routes (`routes/*.routes.ts`)

**Purpose:** Define API endpoints and bind them to controller methods.

**Rules:**
- Only define endpoints
- No business logic
- No database/API calls
- Import and use controllers

**Example:**

```typescript
/** Third Party Imports */
import express, { Request, Response, Router } from 'express';

/** Local Imports */
import { resourceController } from '../controllers/resource.controller.js';

const router: Router = express.Router();

/**
 * GET /api/resources
 * Fetches all resources.
 */
router.get('/', (req: Request, res: Response) => resourceController.getAll(req, res));

/**
 * GET /api/resources/:id
 * Fetches a single resource by ID.
 */
router.get('/:id', (req: Request, res: Response) => resourceController.getById(req, res));

/**
 * POST /api/resources
 * Creates a new resource.
 */
router.post('/', (req: Request, res: Response) => resourceController.create(req, res));

/**
 * PATCH /api/resources/:id
 * Updates a resource.
 */
router.patch('/:id', (req: Request, res: Response) => resourceController.update(req, res));

/**
 * DELETE /api/resources/:id
 * Deletes a resource.
 */
router.delete('/:id', (req: Request, res: Response) => resourceController.delete(req, res));

export default router;
```

### 2. Controllers (`controllers/*.controller.ts`)

**Purpose:** Handle HTTP requests and responses, validate input, format output.

**Rules:**
- Parse request parameters (query, body, params)
- Call service methods
- Format responses (JSON structure)
- Handle HTTP status codes
- Catch and format errors
- NO business logic
- NO direct database access

**Example:**

```typescript
/** Third Party Imports */
import { Request, Response } from 'express';

/** Local Imports */
import { ResourceService } from '../services/resource.service.js';

/**
 * Controller for resource endpoints.
 * Handles HTTP requests and delegates to service layer.
 */
export class ResourceController {
    private readonly resourceService: ResourceService;

    constructor() {
        this.resourceService = new ResourceService();
    }

    /**
     * Handles GET /api/resources
     * Fetches all resources.
     */
    async getAll(req: Request, res: Response): Promise<void> {
        try {
            // Parse query parameters
            const limit = parseInt((req.query.limit as string) || '100', 10);
            const offset = parseInt((req.query.offset as string) || '0', 10);
            const filter = req.query.filter as string | undefined;

            // Call service
            const resources = await this.resourceService.getAll({
                limit,
                offset,
                filter,
            });

            // Format response
            res.json({
                data: resources,
                meta: {
                    limit,
                    offset,
                    count: resources.length,
                },
            });
        } catch (error) {
            console.error('[Resource Controller] Failed to fetch resources:', error);
            res.status(500).json({
                error: 'fetch_failed',
                errorDescription: 'Failed to fetch resources',
            });
        }
    }

    /**
     * Handles GET /api/resources/:id
     * Fetches a single resource by ID.
     */
    async getById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const resource = await this.resourceService.getById(id);

            if (!resource) {
                res.status(404).json({
                    error: 'not_found',
                    errorDescription: `Resource with ID ${id} not found`,
                });
                return;
            }

            res.json({
                data: resource,
            });
        } catch (error) {
            console.error(`[Resource Controller] Failed to fetch resource ${req.params.id}:`, error);
            res.status(500).json({
                error: 'fetch_failed',
                errorDescription: 'Failed to fetch resource',
            });
        }
    }

    /**
     * Handles POST /api/resources
     * Creates a new resource.
     */
    async create(req: Request, res: Response): Promise<void> {
        try {
            const data = req.body;

            const resource = await this.resourceService.create(data);

            res.status(201).json({
                data: resource,
                message: 'Resource created successfully',
            });
        } catch (error) {
            console.error('[Resource Controller] Failed to create resource:', error);
            res.status(500).json({
                error: 'create_failed',
                errorDescription: 'Failed to create resource',
            });
        }
    }

    /**
     * Handles PATCH /api/resources/:id
     * Updates a resource.
     */
    async update(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const data = req.body;

            const resource = await this.resourceService.update(id, data);

            if (!resource) {
                res.status(404).json({
                    error: 'not_found',
                    errorDescription: `Resource with ID ${id} not found`,
                });
                return;
            }

            res.json({
                data: resource,
                message: 'Resource updated successfully',
            });
        } catch (error) {
            console.error(`[Resource Controller] Failed to update resource ${req.params.id}:`, error);
            res.status(500).json({
                error: 'update_failed',
                errorDescription: 'Failed to update resource',
            });
        }
    }

    /**
     * Handles DELETE /api/resources/:id
     * Deletes a resource.
     */
    async delete(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            await this.resourceService.delete(id);

            res.json({
                message: 'Resource deleted successfully',
            });
        } catch (error) {
            console.error(`[Resource Controller] Failed to delete resource ${req.params.id}:`, error);
            res.status(500).json({
                error: 'delete_failed',
                errorDescription: 'Failed to delete resource',
            });
        }
    }
}

/**
 * Singleton instance of the controller.
 */
export const resourceController = new ResourceController();
```

### 3. Services (`services/*.service.ts`)

**Purpose:** Contain business logic, orchestrate data operations, transform data.

**Rules:**
- Implement business logic
- Call database/API clients
- Transform data (mappers)
- Validate business rules
- NO HTTP concerns (no Request/Response)
- Return domain objects/DTOs

**Example:**

```typescript
/** Local Imports */
import { supabaseClient } from './supabase-client.service.js';
import { resourceMapper } from './resource-mapper.service.js';
import { Resource } from '../types/api.types.js';

/**
 * Options for fetching resources.
 */
interface GetAllOptions {
    limit?: number;
    offset?: number;
    filter?: string;
}

/**
 * Service for resource business logic.
 * Handles data operations and transformations.
 */
export class ResourceService {
    /**
     * Fetches all resources with optional filtering.
     *
     * @param options - Query options
     * @returns Promise resolving to array of resources
     * @throws Error if the operation fails
     */
    async getAll(options: GetAllOptions): Promise<Resource[]> {
        const { limit = 100, offset = 0, filter } = options;

        // Fetch from database
        const dbRecords = await supabaseClient
            .from('resources')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply business logic / filtering
        let filtered = dbRecords.data || [];
        if (filter) {
            filtered = filtered.filter(/* your filter logic */);
        }

        // Transform to frontend format
        return resourceMapper.toResourceList(filtered);
    }

    /**
     * Fetches a single resource by ID.
     *
     * @param id - Resource ID
     * @returns Promise resolving to resource or null
     * @throws Error if the operation fails
     */
    async getById(id: string): Promise<Resource | null> {
        const dbRecord = await supabaseClient
            .from('resources')
            .select('*')
            .eq('id', id)
            .single();

        if (!dbRecord.data) {
            return null;
        }

        return resourceMapper.toResource(dbRecord.data);
    }

    /**
     * Creates a new resource.
     *
     * @param data - Resource data
     * @returns Promise resolving to created resource
     * @throws Error if the operation fails
     */
    async create(data: Partial<Resource>): Promise<Resource> {
        // Apply business rules / validation
        const validatedData = this.validateResourceData(data);

        // Insert into database
        const dbRecord = await supabaseClient
            .from('resources')
            .insert(validatedData)
            .select()
            .single();

        return resourceMapper.toResource(dbRecord.data);
    }

    /**
     * Updates a resource.
     *
     * @param id - Resource ID
     * @param data - Partial resource data
     * @returns Promise resolving to updated resource or null
     * @throws Error if the operation fails
     */
    async update(id: string, data: Partial<Resource>): Promise<Resource | null> {
        const dbRecord = await supabaseClient
            .from('resources')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (!dbRecord.data) {
            return null;
        }

        return resourceMapper.toResource(dbRecord.data);
    }

    /**
     * Deletes a resource.
     *
     * @param id - Resource ID
     * @returns Promise resolving when deletion is complete
     * @throws Error if the operation fails
     */
    async delete(id: string): Promise<void> {
        await supabaseClient.from('resources').delete().eq('id', id);
    }

    /**
     * Private helper: Validates resource data.
     */
    private validateResourceData(data: Partial<Resource>): any {
        // Implement validation logic
        return data;
    }
}
```

## File Naming Conventions

- **Routes:** `resource.routes.ts` (plural noun)
- **Controllers:** `resource.controller.ts` (singular noun)
- **Services:** `resource.service.ts` (singular noun)
- **Types:** `resource.types.ts` or `database.types.ts`

## Import Organization

All server files must follow this import structure:

```typescript
/** Node Imports */
import { readFile } from 'fs/promises';

/** Third Party Imports */
import express from 'express';

/** Local Imports */
import { ResourceService } from '../services/resource.service.js';
```

**Important:** Always use `.js` extension for local imports in server files.

## Barrel Exports (index.ts)

Each directory should have an `index.ts` for clean imports:

```typescript
// controllers/index.ts
export * from './resource.controller.js';
export * from './user.controller.js';

// services/index.ts
export * from './resource.service.js';
export * from './user.service.js';
```

## Registering Routes in Server

In `src/server.ts`:

```typescript
/** BFF Imports */
import resourceRoutes from './server/routes/resource.routes.js';
import userRoutes from './server/routes/user.routes.js';

// Register routes
app.use('/api/resources', resourceRoutes);
app.use('/api/users', userRoutes);
```

## Error Handling Pattern

### Controller Error Response Format

```typescript
res.status(statusCode).json({
    error: 'error_code',           // snake_case error identifier
    errorDescription: 'Human readable message',
});
```

### Common HTTP Status Codes

- `200` - Success (GET, PATCH, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Testing Pattern

Each layer should be testable independently:

- **Routes:** Test endpoint bindings
- **Controllers:** Test request/response handling
- **Services:** Test business logic (mock database)

## Example: Complete CRUD Implementation

See `src/server/routes/programmatic.routes.ts`, `src/server/controllers/programmatic.controller.ts`, and `src/server/services/programmatic-ads.service.ts` for a complete working example.

## Summary Checklist

When implementing a new API resource:

- [ ] Create database types in `types/database.types.ts`
- [ ] Create service in `services/resource.service.ts`
  - [ ] Implement business logic
  - [ ] Handle database operations
  - [ ] Transform data
- [ ] Create controller in `controllers/resource.controller.ts`
  - [ ] Parse request parameters
  - [ ] Call service methods
  - [ ] Format responses
  - [ ] Handle errors
- [ ] Create routes in `routes/resource.routes.ts`
  - [ ] Define endpoints
  - [ ] Bind to controller methods
- [ ] Register routes in `src/server.ts`
- [ ] Export from `index.ts` files

---

**Remember:** Routes → Controllers → Services → Database/API

Never skip layers or mix responsibilities!
