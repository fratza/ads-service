import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

/** BFF Imports */
import { SERVER_CONFIG } from './server/config/environment.config.js';
import { securityHeaders } from './server/middleware/security.middleware.js';
import { validateOrigin } from './server/middleware/origin.middleware.js';
import { httpClient } from './server/services/http-client.service.js';
import { resourceRoutes } from './server/routes/index.js';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Security Headers Middleware
 * Applies security headers to all responses (NCA-3.5 compliance).
 */
app.use(securityHeaders);

/**
 * Disable X-Powered-By header
 * Prevents information disclosure about Express.
 */
app.disable('x-powered-by');

/**
 * BFF Middleware Configuration
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Request logging middleware (development only)
 */
if (SERVER_CONFIG.ENABLE_LOGGING) {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}

/**
 * BFF API Routes - MVC Pattern
 * Register specific routes before the generic proxy
 */
app.use('/api/resources', validateOrigin, resourceRoutes);

/**
 * BFF API Routes - Generic Proxy
 * Forwards all /api requests to the backend while hiding the backend URL.
 * Origin validation ensures only your frontend can use this proxy.
 */
const proxyHandler = async (req: express.Request, res: express.Response) => {
    try {
        const method = req.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
        // Include /api prefix since backend expects the full path
        const endpoint = `/api${req.path}`;

        console.log({ data: req.body });

        let response;
        if (method === 'get' || method === 'delete') {
            response = await httpClient[method](endpoint);
        } else {
            response = await httpClient[method](endpoint, req.body);
        }

        res.json(response);
    } catch (error) {
        console.error(`[Proxy] Request failed: ${req.method} ${req.path}`, error);
        const statusCode = (error as any)?.response?.status || 500;
        const errorData = (error as any)?.response?.data || {
            error: 'proxy_error',
            errorDescription: 'Unable to complete request.',
        };
        res.status(statusCode).json(errorData);
    }
};

// Catch-all for API routes - add this inline to avoid Angular SSR parsing
app.use('/api', validateOrigin, (req, res, next) => {
    proxyHandler(req, res).catch(next);
});

/**
 * Serve static files from /browser
 */
app.use(
    express.static(browserDistFolder, {
        maxAge: '1y',
        index: false,
        redirect: false,
    }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
    angularApp
        .handle(req)
        .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
        .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
    const port = process.env['PORT'] || 4000;
    app.listen(port, (error) => {
        if (error) {
            throw error;
        }

        console.log(`Node Express server listening on http://localhost:${port}`);
    });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
