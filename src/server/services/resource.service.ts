/** Local Imports */
import { httpClient } from './http-client.service.js';

/**
 * Example resource type
 */
export interface Resource {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

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

        // Build query parameters
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
            ...(filter && { filter }),
        });

        // Fetch from backend API
        const response = await httpClient.get<{ data: Resource[] }>(
            `/api/resources?${params.toString()}`,
        );

        return response.data;
    }

    /**
     * Fetches a single resource by ID.
     *
     * @param id - Resource ID
     * @returns Promise resolving to resource or null
     * @throws Error if the operation fails
     */
    async getById(id: string): Promise<Resource | null> {
        try {
            const response = await httpClient.get<{ data: Resource }>(`/api/resources/${id}`);
            return response.data;
        } catch (error) {
            // If 404, return null instead of throwing
            if (error instanceof Error && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
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

        // Send to backend API
        const response = await httpClient.post<Partial<Resource>, { data: Resource }>(
            '/api/resources',
            validatedData,
        );

        return response.data;
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
        try {
            const response = await httpClient.patch<Partial<Resource>, { data: Resource }>(
                `/api/resources/${id}`,
                data,
            );
            return response.data;
        } catch (error) {
            // If 404, return null instead of throwing
            if (error instanceof Error && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Deletes a resource.
     *
     * @param id - Resource ID
     * @returns Promise resolving when deletion is complete
     * @throws Error if the operation fails
     */
    async delete(id: string): Promise<void> {
        await httpClient.delete(`/api/resources/${id}`);
    }

    /**
     * Private helper: Validates resource data.
     */
    private validateResourceData(data: Partial<Resource>): Partial<Resource> {
        // Implement validation logic here
        if (!data.name || data.name.trim().length === 0) {
            throw new Error('Resource name is required');
        }

        return {
            ...data,
            name: data.name.trim(),
        };
    }
}
