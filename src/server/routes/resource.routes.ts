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
