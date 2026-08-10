/**
 * Type definitions for API-related operations.
 */

/**
 * Generic API error response
 */
export interface ApiErrorResponse {
    /** Error code */
    error: string;

    /** Human-readable error description */
    errorDescription?: string;
}

/**
 * Generic API success response
 */
export interface ApiSuccessResponse<T = unknown> {
    /** Response data */
    data: T;

    /** Optional message */
    message?: string;
}
