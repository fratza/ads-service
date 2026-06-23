/** Third Party Imports */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/** Local Imports */
import { API_CONFIG, SERVER_CONFIG } from '../config/environment.config.js';

/**
 * Generic HTTP client service for making API requests.
 * Provides a centralized, type-safe interface for all external API communication.
 *
 * @remarks
 * This service abstracts HTTP implementation details, allowing easy changes
 * to the underlying HTTP library or backend provider without affecting consumers.
 * It provides automatic timeout handling, request/response logging, and error handling.
 */
export class HttpClientService {
    private readonly client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_CONFIG.BASE_URL,
            timeout: API_CONFIG.TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add request logging interceptor
        if (SERVER_CONFIG.ENABLE_LOGGING) {
            this.client.interceptors.request.use((config) => {
                console.log(
                    `[HTTP Client] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
                );
                return config;
            });

            this.client.interceptors.response.use(
                (response) => {
                    console.log(
                        `[HTTP Client] Response received from ${response.config.baseURL}${response.config.url}`,
                    );
                    return response;
                },
                (error) => {
                    console.error('[HTTP Client] Request failed:', error.message);
                    return Promise.reject(error);
                },
            );
        }
    }

    /**
     * Makes a POST request to the API.
     *
     * @param endpoint - API endpoint path (e.g., '/api/auth/login')
     * @param body - Request body payload
     * @param config - Optional axios request configuration
     * @returns Promise resolving to the response data
     * @throws Error if the request fails
     *
     * @example
     * ```typescript
     * const response = await httpClient.post<LoginRequest, LoginResponse>(
     *     '/api/auth/login',
     *     { username: 'user', password: 'pass' }
     * );
     * ```
     */
    async post<TRequest = unknown, TResponse = unknown>(
        endpoint: string,
        body: TRequest,
        config?: AxiosRequestConfig,
    ): Promise<TResponse> {
        try {
            const response = await this.client.post<TResponse>(endpoint, body, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Makes a GET request to the API.
     *
     * @param endpoint - API endpoint path
     * @param config - Optional axios request configuration
     * @returns Promise resolving to the response data
     * @throws Error if the request fails
     *
     * @example
     * ```typescript
     * const user = await httpClient.get<User>('/api/users/123');
     * ```
     */
    async get<TResponse = unknown>(
        endpoint: string,
        config?: AxiosRequestConfig,
    ): Promise<TResponse> {
        try {
            const response = await this.client.get<TResponse>(endpoint, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Makes a PUT request to the API.
     *
     * @param endpoint - API endpoint path
     * @param body - Request body payload
     * @param config - Optional axios request configuration
     * @returns Promise resolving to the response data
     * @throws Error if the request fails
     */
    async put<TRequest = unknown, TResponse = unknown>(
        endpoint: string,
        body: TRequest,
        config?: AxiosRequestConfig,
    ): Promise<TResponse> {
        try {
            const response = await this.client.put<TResponse>(endpoint, body, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Makes a PATCH request to the API.
     *
     * @param endpoint - API endpoint path
     * @param body - Request body payload
     * @param config - Optional axios request configuration
     * @returns Promise resolving to the response data
     * @throws Error if the request fails
     */
    async patch<TRequest = unknown, TResponse = unknown>(
        endpoint: string,
        body: TRequest,
        config?: AxiosRequestConfig,
    ): Promise<TResponse> {
        try {
            const response = await this.client.patch<TResponse>(endpoint, body, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Makes a DELETE request to the API.
     *
     * @param endpoint - API endpoint path
     * @param config - Optional axios request configuration
     * @returns Promise resolving to the response data
     * @throws Error if the request fails
     */
    async delete<TResponse = unknown>(
        endpoint: string,
        config?: AxiosRequestConfig,
    ): Promise<TResponse> {
        try {
            const response = await this.client.delete<TResponse>(endpoint, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Handles HTTP errors and transforms them into user-friendly error messages.
     *
     * @param error - Error object from axios
     * @returns Transformed error object
     */
    private handleError(error: unknown): Error {
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                return new Error(`Request timeout after ${API_CONFIG.TIMEOUT}ms`);
            }

            if (error.response) {
                // Server responded with error status
                const status = error.response.status;
                const message = error.response.data?.message || error.response.statusText;
                return new Error(`API error ${status}: ${message}`);
            }

            if (error.request) {
                // Request was made but no response received
                return new Error('No response received from API');
            }
        }

        // Generic error
        return error instanceof Error ? error : new Error('Unknown error occurred');
    }
}

/**
 * Singleton instance of the HTTP client service.
 * Use this instance throughout the application for consistency.
 */
export const httpClient = new HttpClientService();
