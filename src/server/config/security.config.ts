/**
 * Security Configuration
 * Centralized whitelist for Content Security Policy (CSP) domains.
 *
 * @remarks
 * Modify these arrays to whitelist additional domains for your application.
 * Common use cases:
 * - CDN domains (images, fonts, scripts)
 * - Third-party APIs (analytics, payment processors)
 * - External services (Supabase, Firebase, etc.)
 */

/**
 * Whitelisted script sources.
 * Domains allowed to load JavaScript.
 *
 * @example
 * ```typescript
 * export const SCRIPT_SOURCES = [
 *   'https://kit.fontawesome.com',
 *   'https://cdn.example.com',
 * ];
 * ```
 */
export const SCRIPT_SOURCES = [
    'https://kit.fontawesome.com',
];

/**
 * Whitelisted style sources.
 * Domains allowed to load CSS stylesheets.
 *
 * @example
 * ```typescript
 * export const STYLE_SOURCES = [
 *   'https://fonts.googleapis.com',
 *   'https://cdn.example.com',
 * ];
 * ```
 */
export const STYLE_SOURCES = [
    'https://fonts.googleapis.com',
    'https://kit.fontawesome.com',
];

/**
 * Whitelisted image sources.
 * Domains allowed to load images.
 *
 * @example
 * ```typescript
 * export const IMAGE_SOURCES = [
 *   'https://*.cdn.example.com',
 *   'https://images.unsplash.com',
 * ];
 * ```
 */
export const IMAGE_SOURCES = [
    'https:', // Allow all HTTPS images (adjust as needed)
];

/**
 * Whitelisted font sources.
 * Domains allowed to load web fonts.
 *
 * @example
 * ```typescript
 * export const FONT_SOURCES = [
 *   'https://fonts.gstatic.com',
 *   'https://use.typekit.net',
 * ];
 * ```
 */
export const FONT_SOURCES = [
    'https://fonts.gstatic.com',
    'https://kit.fontawesome.com',
    'https://ka-p.fontawesome.com',
];

/**
 * Whitelisted connection sources.
 * Domains allowed for fetch, XHR, WebSocket connections.
 *
 * @example
 * ```typescript
 * export const CONNECT_SOURCES = [
 *   'https://api.example.com',
 *   'wss://socket.example.com',
 * ];
 * ```
 */
export const CONNECT_SOURCES = [
    'https://ka-f.fontawesome.com',
    'https://ka-p.fontawesome.com',
];

export const MEDIA_SOURCES = [
    'https://cdn.creatomate.com',
];

/**
 * Build CSP directive string from sources array.
 *
 * @param directive - CSP directive name (e.g., 'script-src', 'style-src')
 * @param sources - Array of whitelisted domains
 * @param includeDefaults - Whether to include 'self', data:, etc.
 * @returns Formatted CSP directive string
 */
export function buildCspDirective(
    directive: string,
    sources: string[],
    includeDefaults: string[] = ["'self'"],
): string {
    return [directive, ...includeDefaults, ...sources].join(' ');
}
