/** Node Imports */
import { config } from 'dotenv';

// Load environment variables from .env file
config();

/**
 * Environment configuration for BFF layer.
 * Centralizes all environment-dependent settings.
 *
 * @remarks
 * All configuration values are loaded from environment variables.
 * Required variables will throw an error if not set.
 */

/**
 * Validates that a required environment variable is set.
 *
 * @param key - Environment variable name
 * @param value - Environment variable value
 * @throws Error if value is undefined or empty
 * @returns The validated value
 */
function requireEnv(key: string, value: string | undefined): string {
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

/**
 * API configuration for backend communication.
 */
export const API_CONFIG = {
    /** Base URL for backend API */
    BASE_URL: process.env['API_BASE_URL'] || 'https://api.example.com',

    /** Timeout for API calls in milliseconds */
    TIMEOUT: parseInt(process.env['API_TIMEOUT'] || '30000', 10),
} as const;

/**
 * Server configuration
 */
export const SERVER_CONFIG = {
    /** Port the server listens on */
    PORT: parseInt(process.env['PORT'] || '4000', 10),

    /** Node environment */
    NODE_ENV: process.env['NODE_ENV'] || 'development',

    /** Enable request logging */
    ENABLE_LOGGING: process.env['ENABLE_LOGGING'] === 'true',
} as const;
