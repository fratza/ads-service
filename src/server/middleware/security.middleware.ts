/** Third Party Imports */
import { NextFunction, Request, Response } from 'express';

/** Local Imports */
import {
    CONNECT_SOURCES,
    FONT_SOURCES,
    IMAGE_SOURCES,
    MEDIA_SOURCES,
    SCRIPT_SOURCES,
    STYLE_SOURCES,
} from '../config/security.config.js';

/**
 * Security headers middleware.
 * Implements security headers as per penetration test findings (NCA-3.5).
 *
 * @remarks
 * Headers are applied in order of complexity:
 * - Simple headers: HSTS, X-Content-Type-Options (implemented first)
 * - Complex headers: CSP, Permissions Policy, Referrer Policy (implemented after testing)
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 * @returns void
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
    // ============================================================================
    // SIMPLE HEADERS (No functional impact)
    // ============================================================================

    /**
     * Strict-Transport-Security (HSTS)
     * Forces HTTPS connections for 1 year, including subdomains.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
     */
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    /**
     * X-Content-Type-Options
     * Prevents MIME type sniffing attacks.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
     */
    res.setHeader('X-Content-Type-Options', 'nosniff');

    /**
     * X-Frame-Options
     * Prevents clickjacking by allowing framing only from same origin.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
     */
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // ============================================================================
    // COMPLEX HEADERS (Test carefully before deployment)
    // ============================================================================

    /**
     * Content-Security-Policy (CSP)
     * Restricts sources for scripts, styles, images, etc.
     *
     * Whitelisted domains are imported from security.config.ts
     * Modify that file to add/remove allowed domains.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
     */
    const csp = [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${SCRIPT_SOURCES.join(' ')}`, // unsafe-eval needed for Angular dev mode
        `style-src 'self' 'unsafe-inline' ${STYLE_SOURCES.join(' ')}`, // unsafe-inline needed for Angular component styles
        `img-src 'self' data: ${IMAGE_SOURCES.join(' ')}`,
        `font-src 'self' data: ${FONT_SOURCES.join(' ')}`,
        `connect-src 'self' ${CONNECT_SOURCES.join(' ')}`,
        `media-src 'self' blob: ${MEDIA_SOURCES.join(' ')}`,
        "frame-src 'self' https://creatomate.com",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);

    /**
     * Permissions-Policy
     * Controls which browser features and APIs can be used.
     *
     * Disabled features:
     * - geolocation, microphone, camera (not needed)
     * - payment (not implemented)
     * - usb (not needed)
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
     */
    const permissionsPolicy = [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'payment=()',
        'usb=()',
    ].join(', ');
    res.setHeader('Permissions-Policy', permissionsPolicy);

    /**
     * Referrer-Policy
     * Controls how much referrer information is sent with requests.
     *
     * strict-origin-when-cross-origin:
     * - Same origin: Full URL
     * - Cross origin HTTPS: Origin only
     * - Cross origin HTTP (downgrade): No referrer
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
     */
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
}
