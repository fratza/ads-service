import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { AdvertisementRequest } from './app/core/models/advertisement.models.js';

/** BFF Imports */
import { SERVER_CONFIG } from './server/config/environment.config.js';
import { validateOrigin, validateOriginOrApiKey } from './server/middleware/origin.middleware.js';
import { securityHeaders } from './server/middleware/security.middleware.js';
import { advertisementRequestRoutes, resourceRoutes } from './server/routes/index.js';
import { httpClient } from './server/services/http-client.service.js';
import { advertisementIdeaService } from './server/services/advertisement-idea.service.js';
import { storyboardImageService } from './server/services/storyboard-image.service.js';
import { templateJsonEditorService } from './server/services/template-json-editor.service.js';
import { templateMappingService } from './server/services/template-mapping.service.js';

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
// Default 100kb is too small for full Creatomate template JSON payloads
// round-tripped through the AI JSON editor endpoint.
app.use(express.json({ limit: '2mb' }));
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
app.use('/api/advertisement-requests', validateOriginOrApiKey, advertisementRequestRoutes);
app.use('/api/resources', validateOrigin, resourceRoutes);

// Notifications are not part of this BFF yet. Handle legacy client requests
// locally so they do not fall through to the generic upstream proxy.
app.get('/api/admin/notifications', validateOrigin, (_req, res) => {
    res.json([]);
});

interface CreatomateRenderRequest {
    requestId: string;
    output: 'outside' | 'inside' | 'vertical';
    businessName: string;
    headline: string;
    supportingText: string;
    contact: string;
    templateId?: string;
    modifications?: Record<string, string>;
    /** Full AI-edited template JSON. When present, takes precedence over templateId + modifications. */
    source?: Record<string, unknown>;
}

const creatomateRequest = async (
    path: string,
    init?: RequestInit,
    version: 'v1' | 'v2' = 'v2',
): Promise<Response> => {
    const apiKey = process.env['CREATOMATE_API_KEY'];
    if (!apiKey) throw new Error('CREATOMATE_NOT_CONFIGURED');
    return fetch(`https://api.creatomate.com/${version}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            ...init?.headers,
        },
    });
};

app.get('/api/creatomate/templates', validateOrigin, async (_req, res) => {
    try {
        const response = await creatomateRequest('/templates', undefined, 'v1');
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        if ((error as Error).message === 'CREATOMATE_NOT_CONFIGURED') {
            res.status(503).json({
                error: 'creatomate_not_configured',
                errorDescription:
                    'Add CREATOMATE_API_KEY to the server .env file and restart the app.',
            });
            return;
        }
        console.error('[Creatomate] Unable to retrieve templates', error);
        res.status(502).json({
            error: 'creatomate_error',
            errorDescription: 'Unable to retrieve Creatomate templates.',
        });
    }
});

app.get('/api/creatomate/templates/:id', validateOrigin, async (req, res) => {
    try {
        const rawId = req.params['id'];
        const id = encodeURIComponent((Array.isArray(rawId) ? rawId[0] : rawId) ?? '');
        const response = await creatomateRequest(`/templates/${id}`, undefined, 'v1');
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(502).json({
            error: 'creatomate_error',
            errorDescription: 'Unable to retrieve the Creatomate template.',
        });
    }
});

app.get('/api/creatomate/preview-config', validateOrigin, (_req, res) => {
    const playerToken = process.env['CREATOMATE_PLAYER_TOKEN'];
    if (!playerToken) {
        res.status(503).json({
            error: 'preview_not_configured',
            errorDescription:
                'Add CREATOMATE_PLAYER_TOKEN to the server .env file and restart the app.',
        });
        return;
    }
    res.json({ playerToken });
});

app.post('/api/creatomate/template-mappings', validateOrigin, async (req, res) => {
    const body = req.body as {
        templateSource?: Record<string, unknown>;
        request?: unknown;
    };
    if (
        !body.templateSource ||
        typeof body.templateSource !== 'object' ||
        !body.request ||
        typeof body.request !== 'object' ||
        typeof (body.request as { businessName?: unknown }).businessName !== 'string'
    ) {
        res.status(400).json({
            error: 'invalid_mapping_request',
            errorDescription: 'A template source and advertisement request are required.',
        });
        return;
    }

    try {
        const result = await templateMappingService.suggest(
            body.templateSource,
            body.request as AdvertisementRequest,
        );
        res.json(result);
    } catch (error) {
        if ((error as Error).message === 'SKILLHUB_NOT_CONFIGURED') {
            res.status(503).json({
                error: 'skillhub_not_configured',
                errorDescription:
                    'Add SKILLHUB_API_KEY to the server .env file and restart the app.',
            });
            return;
        }
        console.error('[SkillHub] Unable to map template values', error);
        res.status(502).json({
            error: 'skillhub_mapping_failed',
            errorDescription:
                'SkillHub could not suggest template mappings. The standard mapper is still available.',
        });
    }
});

app.post('/api/advertisement-ideas/generate', validateOrigin, async (req, res) => {
    const body = req.body as { context?: unknown };
    if (typeof body.context !== 'string' || !body.context.trim()) {
        res.status(400).json({
            error: 'invalid_advertisement_idea_request',
            errorDescription: 'Advertisement context is required.',
        });
        return;
    }
    try {
        res.json(await advertisementIdeaService.generate(body.context));
    } catch (error) {
        const message = (error as Error).message;
        if (message === 'OPENAI_NOT_CONFIGURED') {
            res.status(503).json({
                error: 'openai_not_configured',
                errorDescription: 'Add OPENAI_API_KEY to the server .env file and restart the app.',
            });
            return;
        }
        if (message === 'OPENAI_EMPTY_CONTEXT') {
            res.status(400).json({
                error: 'empty_context',
                errorDescription: 'Add some advertisement details before generating an idea.',
            });
            return;
        }
        console.error('[OpenAI] Unable to generate advertisement idea', error);
        res.status(502).json({
            error: 'openai_idea_failed',
            errorDescription: 'The advertisement direction could not be generated. Try again.',
        });
    }
});

app.post('/api/storyboard-images/generate', validateOrigin, async (req, res) => {
    const body = req.body as { prompt?: unknown; output?: unknown };
    if (
        typeof body.prompt !== 'string' ||
        !body.prompt.trim() ||
        !['outside', 'inside', 'vertical'].includes(String(body.output))
    ) {
        res.status(400).json({
            error: 'invalid_storyboard_image_request',
            errorDescription: 'A scene prompt and valid ad output are required.',
        });
        return;
    }

    try {
        res.json(await storyboardImageService.generate(body.prompt, body.output as 'outside' | 'inside' | 'vertical'));
    } catch (error) {
        const message = (error as Error).message;
        if (message === 'OPENAI_NOT_CONFIGURED') {
            res.status(503).json({
                error: 'openai_not_configured',
                errorDescription: 'Add OPENAI_API_KEY to the server .env file and restart the app.',
            });
            return;
        }
        if (message === 'OPENAI_EMPTY_PROMPT') {
            res.status(400).json({
                error: 'empty_prompt',
                errorDescription: 'Add visual direction before generating a concept frame.',
            });
            return;
        }
        console.error('[OpenAI] Unable to generate storyboard image', error);
        res.status(502).json({
            error: 'openai_image_failed',
            errorDescription: 'The concept frame could not be generated. Try again.',
        });
    }
});

app.post('/api/creatomate/template-json-edit', validateOrigin, async (req, res) => {
    const body = req.body as { source?: unknown; prompt?: unknown; context?: unknown };
    if (
        !body.source ||
        typeof body.source !== 'object' ||
        Array.isArray(body.source) ||
        typeof body.prompt !== 'string' ||
        !body.prompt.trim()
    ) {
        res.status(400).json({
            error: 'invalid_edit_request',
            errorDescription: 'A template source JSON and an edit instruction are required.',
        });
        return;
    }

    try {
        const result = await templateJsonEditorService.edit(
            body.source as Record<string, unknown>,
            body.prompt,
            body.context as
                | { selectedElement?: { id: string; name: string; type: string } }
                | undefined,
        );
        res.json(result);
    } catch (error) {
        const message = (error as Error).message;
        if (message === 'OPENAI_NOT_CONFIGURED') {
            res.status(503).json({
                error: 'openai_not_configured',
                errorDescription: 'Add OPENAI_API_KEY to the server .env file and restart the app.',
            });
            return;
        }
        if (message === 'TEMPLATE_TOO_LARGE') {
            res.status(413).json({
                error: 'template_too_large',
                errorDescription: 'This template is too large for AI editing.',
            });
            return;
        }
        if (message === 'OPENAI_EMPTY_PROMPT') {
            res.status(400).json({
                error: 'empty_prompt',
                errorDescription: 'Describe the change you want the AI to make.',
            });
            return;
        }
        console.error('[OpenAI] Unable to edit template JSON', error);
        res.status(502).json({
            error: 'openai_edit_failed',
            errorDescription:
                'The AI could not edit this template. Try rephrasing your instruction.',
        });
    }
});

app.post('/api/creatomate/renders', validateOrigin, async (req, res) => {
    try {
        const body = req.body as Partial<CreatomateRenderRequest>;
        if (!body.requestId || !body.businessName || !body.output) {
            res.status(400).json({
                error: 'invalid_request',
                errorDescription: 'Request ID, business name, and output type are required.',
            });
            return;
        }
        const vertical = body.output === 'vertical';
        const clean = (value: unknown, fallback = ''): string =>
            typeof value === 'string' ? value.trim().slice(0, 180) : fallback;
        const renderScriptPayload = {
            output_format: 'mp4',
            width: vertical ? 720 : 1280,
            height: vertical ? 1280 : 720,
            duration: 5,
            frame_rate: 30,
            snapshot_time: 2.5,
            metadata: JSON.stringify({ requestId: clean(body.requestId), output: body.output }),
            elements: [
                {
                    name: 'Business-Name',
                    type: 'text',
                    track: 1,
                    duration: 5,
                    x: '50%',
                    y: '19%',
                    width: '84%',
                    height: '10%',
                    x_alignment: '50%',
                    y_alignment: '50%',
                    text: clean(body.businessName),
                    fill_color: '#9bd538',
                    font_family: 'Montserrat',
                    font_weight: '800',
                    font_size: vertical ? '4.2 vmin' : '3.2 vmin',
                    background_color: '#0a1735',
                    background_x_padding: '14%',
                    background_y_padding: '35%',
                },
                {
                    name: 'Main-Headline',
                    type: 'text',
                    track: 2,
                    duration: 5,
                    x: '50%',
                    y: '48%',
                    width: '82%',
                    height: '28%',
                    x_alignment: '50%',
                    y_alignment: '50%',
                    text: clean(body.headline, 'Your message goes here'),
                    fill_color: '#ffffff',
                    font_family: 'Montserrat',
                    font_weight: '800',
                    font_size: vertical ? '7 vmin' : '5.4 vmin',
                    background_color: '#17366f',
                    background_x_padding: '12%',
                    background_y_padding: '28%',
                },
                {
                    name: 'Supporting-Text',
                    type: 'text',
                    track: 3,
                    duration: 5,
                    x: '50%',
                    y: '72%',
                    width: '78%',
                    height: '12%',
                    x_alignment: '50%',
                    y_alignment: '50%',
                    text: clean(body.supportingText),
                    fill_color: '#dbe5f7',
                    font_family: 'Montserrat',
                    font_weight: '500',
                    font_size: vertical ? '3.5 vmin' : '2.5 vmin',
                },
                {
                    name: 'Contact',
                    type: 'text',
                    track: 4,
                    duration: 5,
                    x: '50%',
                    y: '90%',
                    width: '84%',
                    height: '8%',
                    x_alignment: '50%',
                    y_alignment: '50%',
                    text: clean(body.contact),
                    fill_color: '#ffffff',
                    font_family: 'Montserrat',
                    font_weight: '700',
                    font_size: vertical ? '3 vmin' : '2.2 vmin',
                },
            ],
        };
        const suppliedModifications =
            body.modifications && typeof body.modifications === 'object'
                ? Object.fromEntries(
                      Object.entries(body.modifications)
                          .slice(0, 90)
                          .filter(
                              ([key, value]) =>
                                  /^[A-Za-z0-9_. -]{1,100}$/.test(key) && typeof value === 'string',
                          )
                          .map(([key, value]) => [key, clean(value)]),
                  )
                : {};
        const defaultModifications = {
            'Business-Name': clean(body.businessName),
            'Main-Headline': clean(body.headline, 'Your message goes here'),
            'Supporting-Text': clean(body.supportingText),
            Contact: clean(body.contact),
            Website: clean(body.contact),
        };
        const templatePayload = {
            template_id: clean(body.templateId),
            metadata: JSON.stringify({ requestId: clean(body.requestId), output: body.output }),
            modifications: Object.keys(suppliedModifications).length
                ? suppliedModifications
                : defaultModifications,
        };
        const suppliedSource =
            body.source && typeof body.source === 'object' && !Array.isArray(body.source)
                ? body.source
                : undefined;
        const sourcePayload = suppliedSource
            ? {
                  source: suppliedSource,
                  metadata: JSON.stringify({
                      requestId: clean(body.requestId),
                      output: body.output,
                  }),
              }
            : undefined;
        const payload = sourcePayload ?? (body.templateId ? templatePayload : renderScriptPayload);
        const response = await creatomateRequest('/renders', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        if ((error as Error).message === 'CREATOMATE_NOT_CONFIGURED') {
            res.status(503).json({
                error: 'creatomate_not_configured',
                errorDescription:
                    'Add CREATOMATE_API_KEY to the server .env file and restart the app.',
            });
            return;
        }
        console.error('[Creatomate] Unable to create render', error);
        res.status(502).json({
            error: 'creatomate_error',
            errorDescription: 'Creatomate could not create the render.',
        });
    }
});

app.get('/api/creatomate/renders/:id', validateOrigin, async (req, res) => {
    try {
        const rawId = req.params['id'];
        const id = encodeURIComponent((Array.isArray(rawId) ? rawId[0] : rawId) ?? '');
        const response = await creatomateRequest(`/renders/${id}`);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        if ((error as Error).message === 'CREATOMATE_NOT_CONFIGURED') {
            res.status(503).json({
                error: 'creatomate_not_configured',
                errorDescription:
                    'Add CREATOMATE_API_KEY to the server .env file and restart the app.',
            });
            return;
        }
        res.status(502).json({
            error: 'creatomate_error',
            errorDescription: 'Unable to retrieve the Creatomate render.',
        });
    }
});

interface TriviaJobStatus {
    id: string;
    status: string;
    progress: number;
    statusUrl: string;
    downloadUrl: string | null;
    error?: string | null;
    skippedRows?: Array<{ index: number; reason: string; question?: string }>;
    [key: string]: unknown;
}

interface TriviaRequestStatus {
    requestId: string;
    category: string;
    quantity: number;
    createdAt: string;
    state: 'pending' | 'error' | 'job';
    error: string | null;
    job: TriviaJobStatus | null;
}

// trivias-api has used both "completed" and "done" for a finished render
// job across versions; treat either as success to avoid drifting again.
const TRIVIA_SUCCESS_STATUSES = ['completed', 'done'];
const TRIVIA_TERMINAL_STATUSES = [...TRIVIA_SUCCESS_STATUSES, 'failed'];

/**
 * In-memory record of every trivia batch triggered from this app, newest
 * first, so the UI can show a table instead of just the last one. The n8n
 * webhook only responds once the whole batch's videos are generated and the
 * Remotion render job is created (it runs a "Respond to Webhook" node right
 * after creating that job), so that call can take several minutes. We fire
 * it without waiting so the browser gets an immediate ack, then fill each
 * request's job in whenever its webhook call resolves.
 */
const triviaRequests: TriviaRequestStatus[] = [];
const triviaOutputUrlSavedForJobIds = new Set<string>();

/**
 * Once a trivia render job completes, write its downloadUrl back onto every
 * `trivia` row that fed into it. The job's composition doesn't carry the
 * original row ids, so rows are matched by trivia.s3_url equaling each
 * item's backgroundVideoUrl (the same value the n8n workflow wrote there).
 */
const saveTriviaOutputUrls = async (job: TriviaJobStatus): Promise<void> => {
    const baseUrl = (process.env['SUPABASE_URL'] ?? '').replace(/\/+$/, '');
    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
    if (!baseUrl || !serviceKey || !job.downloadUrl) return;
    const composition = job['composition'] as
        | { props?: { items?: Array<{ backgroundVideoUrl?: unknown }> } }
        | undefined;
    const backgroundUrls = (composition?.props?.items ?? [])
        .map((item) => item.backgroundVideoUrl)
        .filter((url): url is string => typeof url === 'string' && url.length > 0);
    if (!backgroundUrls.length) return;
    await Promise.all(
        backgroundUrls.map(async (s3Url) => {
            try {
                const response = await fetch(
                    `${baseUrl}/rest/v1/trivia?s3_url=eq.${encodeURIComponent(s3Url)}`,
                    {
                        method: 'PATCH',
                        headers: {
                            apikey: serviceKey,
                            Authorization: `Bearer ${serviceKey}`,
                            'Content-Type': 'application/json',
                            Prefer: 'return=minimal',
                        },
                        body: JSON.stringify({ output_url: job.downloadUrl }),
                        signal: AbortSignal.timeout(15_000),
                    },
                );
                if (!response.ok) {
                    console.error('[Trivia] Failed to save output_url', {
                        s3Url,
                        status: response.status,
                        message: (await response.text()).slice(0, 300),
                    });
                }
            } catch (error) {
                console.error('[Trivia] Failed to save output_url', { s3Url, error });
            }
        }),
    );
};

app.post('/api/trivia/generate', validateOrigin, (req, res) => {
    const webhookUrl = process.env['N8N_TRIVIA_WEBHOOK_URL'];
    if (!webhookUrl) {
        res.status(503).json({
            error: 'trivia_webhook_not_configured',
            errorDescription:
                'Add N8N_TRIVIA_WEBHOOK_URL to the server .env file and restart the app.',
        });
        return;
    }
    const body = req.body as { category?: unknown; quantity?: unknown };
    const category = typeof body.category === 'string' ? body.category.trim().slice(0, 100) : '';
    const quantity = Number(body.quantity);
    if (!category || !Number.isFinite(quantity) || quantity < 1 || quantity > 20) {
        res.status(400).json({
            error: 'invalid_trivia_request',
            errorDescription: 'A category and a quantity between 1 and 20 are required.',
        });
        return;
    }

    const request: TriviaRequestStatus = {
        requestId: randomUUID(),
        category,
        quantity: Math.floor(quantity),
        createdAt: new Date().toISOString(),
        state: 'pending',
        error: null,
        job: null,
    };
    triviaRequests.unshift(request);

    void fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Category: category, Quantity: request.quantity }),
    })
        .then(async (response) => {
            const text = await response.text();
            let data: unknown = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch {
                data = null;
            }
            if (!response.ok) {
                request.state = 'error';
                request.error = `The trivia workflow responded with an error (${response.status}).`;
                return;
            }
            const job = Array.isArray(data) ? data[0] : data;
            if (job && typeof job === 'object' && typeof (job as TriviaJobStatus).id === 'string') {
                request.state = 'job';
                request.job = job as TriviaJobStatus;
            } else {
                request.state = 'error';
                request.error = 'The trivia workflow finished but did not return a job to track.';
            }
        })
        .catch((error: unknown) => {
            console.error('[Trivia] Workflow request failed', error);
            request.state = 'error';
            request.error = 'Unable to reach the trivia generation workflow.';
        });

    res.status(202).json({ requestId: request.requestId });
});

const isTriviaRequestTerminal = (request: TriviaRequestStatus): boolean =>
    request.state === 'error' ||
    (request.state === 'job' &&
        !!request.job &&
        TRIVIA_TERMINAL_STATUSES.includes(request.job.status));

/**
 * Refreshes every still-in-progress request's job status from trivias-api.
 * Shared by the one-off list endpoint and the SSE stream.
 */
const refreshTriviaRequests = async (): Promise<TriviaRequestStatus[]> => {
    const apiKey = process.env['TRIVIAS_API_KEY'];
    if (apiKey) {
        await Promise.all(
            triviaRequests
                .filter(
                    (request) =>
                        request.state === 'job' && request.job && !isTriviaRequestTerminal(request),
                )
                .map(async (request) => {
                    try {
                        const response = await fetch(
                            `https://trivias-api.onrender.com${request.job?.statusUrl}`,
                            { headers: { 'x-api-key': apiKey } },
                        );
                        if (response.ok) {
                            request.job = (await response.json()) as TriviaJobStatus;
                        }
                    } catch (error) {
                        console.error('[Trivia] Unable to refresh job status', error);
                    }
                }),
        );
    }
    for (const request of triviaRequests) {
        const job = request.job;
        if (
            job &&
            TRIVIA_SUCCESS_STATUSES.includes(job.status) &&
            !triviaOutputUrlSavedForJobIds.has(job.id)
        ) {
            triviaOutputUrlSavedForJobIds.add(job.id);
            void saveTriviaOutputUrls(job);
        }
    }
    return triviaRequests;
};

/**
 * Reads already-completed trivia batches straight from Supabase, so history
 * survives a server restart instead of only living in the in-memory list.
 * Rows are grouped by output_url since one compiled video can cover several
 * trivia questions from the same batch.
 */
const fetchTriviaHistory = async (): Promise<TriviaRequestStatus[]> => {
    const baseUrl = (process.env['SUPABASE_URL'] ?? '').replace(/\/+$/, '');
    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
    if (!baseUrl || !serviceKey) return [];
    try {
        const response = await fetch(
            `${baseUrl}/rest/v1/trivia?select=category,output_url&output_url=not.is.null&limit=200`,
            {
                headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
                signal: AbortSignal.timeout(15_000),
            },
        );
        if (!response.ok) {
            console.error('[Trivia] Unable to load history from Supabase', response.status);
            return [];
        }
        const rows = (await response.json()) as Array<{ category: string; output_url: string }>;
        const byOutputUrl = new Map<string, { category: string; count: number }>();
        for (const row of rows) {
            const existing = byOutputUrl.get(row.output_url);
            if (existing) existing.count += 1;
            else byOutputUrl.set(row.output_url, { category: row.category, count: 1 });
        }
        return Array.from(byOutputUrl.entries()).map(([outputUrl, { category, count }]) => ({
            requestId: `history:${outputUrl}`,
            category,
            quantity: count,
            createdAt: '',
            state: 'job',
            error: null,
            job: {
                id:
                    outputUrl
                        .split('/')
                        .pop()
                        ?.replace(/\.[a-z0-9]+$/i, '') ?? outputUrl,
                status: 'done',
                progress: 1,
                statusUrl: '',
                downloadUrl: outputUrl,
                error: null,
            },
        }));
    } catch (error) {
        console.error('[Trivia] Unable to load history from Supabase', error);
        return [];
    }
};

/**
 * Combines this session's live-tracked requests with Supabase history,
 * skipping any historical row that's already represented live (e.g. a batch
 * this session just completed and already wrote back to Supabase).
 */
const mergeTriviaRequests = (
    live: TriviaRequestStatus[],
    history: TriviaRequestStatus[],
): TriviaRequestStatus[] => {
    const liveDownloadUrls = new Set(
        live.map((request) => request.job?.downloadUrl).filter((url): url is string => !!url),
    );
    return [
        ...live,
        ...history.filter((request) => !liveDownloadUrls.has(request.job?.downloadUrl ?? '')),
    ];
};

/**
 * GET /api/trivia/jobs
 * One-off list of every trivia batch triggered from this app, plus history.
 */
app.get('/api/trivia/jobs', validateOrigin, async (_req, res) => {
    const [live, history] = await Promise.all([refreshTriviaRequests(), fetchTriviaHistory()]);
    res.json(mergeTriviaRequests(live, history));
});

/**
 * GET /api/trivia/events
 * Server-Sent Events stream so the browser doesn't have to poll: holds one
 * connection open for as long as the page is up and pushes the full request
 * list every few seconds. History is fetched once per connection rather
 * than on every tick, since it rarely changes within a session.
 */
app.get('/api/trivia/events', validateOrigin, async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
    });
    res.write('\n');

    const history = await fetchTriviaHistory();
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async (): Promise<void> => {
        if (closed) return;
        const live = await refreshTriviaRequests();
        if (closed) return;
        const requests = mergeTriviaRequests(live, history);
        res.write(`data: ${JSON.stringify(requests)}\n\n`);
        const hasActiveRequest = live.some((request) => !isTriviaRequestTerminal(request));
        timer = setTimeout(() => void tick(), hasActiveRequest ? 5000 : 15000);
    };
    void tick();

    req.on('close', () => {
        closed = true;
        if (timer) clearTimeout(timer);
    });
});

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
