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
            const limit = parseInt((req.query['limit'] as string) || '100', 10);
            const offset = parseInt((req.query['offset'] as string) || '0', 10);
            const filter = req.query['filter'] as string | undefined;

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
            const id = String(req.params['id']);

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
            console.error(`[Resource Controller] Failed to fetch resource ${req.params['id']}:`, error);
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
            const id = String(req.params['id']);
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
            console.error(`[Resource Controller] Failed to update resource ${req.params['id']}:`, error);
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
            const id = String(req.params['id']);

            await this.resourceService.delete(id);

            res.json({
                message: 'Resource deleted successfully',
            });
        } catch (error) {
            console.error(`[Resource Controller] Failed to delete resource ${req.params['id']}:`, error);
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
