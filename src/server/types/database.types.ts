/**
 * Type definitions for database operations.
 */

/**
 * Database resource record
 */
export interface DbResource {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Common database timestamp fields
 */
export interface DbTimestamps {
    created_at: string;
    updated_at: string;
}

/**
 * Generic database response wrapper
 */
export interface DbResponse<T> {
    data: T | null;
    error: DbError | null;
}

/**
 * Database error structure
 */
export interface DbError {
    message: string;
    code?: string;
    details?: string;
}
