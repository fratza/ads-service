/** Express Imports */
import { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';

/** Local Imports */
import { SERVER_CONFIG } from '../config/environment.config.js';

/**
 * Validates that requests originate from allowed domains only.
 * Prevents external sites from using your BFF as a proxy.
 *
 * @remarks
 * In development, allows localhost. In production, only allows your domain.
 * This prevents CSRF-like attacks where external sites try to use your API.
 */
export const validateOrigin = (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.get('origin') || req.get('referer');

    // Development: Allow localhost, local domains, and undefined (SSR requests)
    if (SERVER_CONFIG.NODE_ENV === 'development') {
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return next();
        }
    }

    // Production: Only allow your domain
    const allowedOrigins = [
        process.env['ALLOWED_ORIGIN'] || 'https://yourdomain.com',
        // Add more production domains here
    ];

    if (origin && allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
        return next();
    }

    // Reject requests from unknown origins
    console.warn(`[Origin Middleware] Blocked request from: ${origin}`);
    res.status(403).json({
        error: 'forbidden',
        errorDescription: 'Request origin not allowed',
    });
};

const apiKeyMatches = (configuredKey: string | undefined, suppliedKey: string | undefined): boolean => {
    if (!configuredKey || !suppliedKey) return false;
    const expected = Buffer.from(configuredKey);
    const supplied = Buffer.from(suppliedKey);
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
};

/**
 * Browser requests retain origin protection. Trusted external integrations may
 * authenticate with ADVERTISEMENT_INGESTION_API_KEY via the x-api-key header.
 */
export const validateOriginOrApiKey = (req: Request, res: Response, next: NextFunction): void => {
    if (apiKeyMatches(process.env['ADVERTISEMENT_INGESTION_API_KEY'], req.get('x-api-key'))) {
        next();
        return;
    }
    validateOrigin(req, res, next);
};
