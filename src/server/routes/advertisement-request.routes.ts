import express, { Request, Response, Router } from 'express';
import { randomUUID } from 'node:crypto';
import {
    AdvertisementIngestionEnvelope,
    AdvertisementRequest,
    AssetCategory,
} from '../../app/core/models/advertisement.models.js';
import {
    AdvertisementInputError,
    AdvertisementRequestIngestionService,
} from '../services/advertisement-request-ingestion.service.js';
import { AdvertisementRequestStoreService } from '../services/advertisement-request-store.service.js';
import { supabaseStorageService } from '../services/supabase-storage.service.js';

const router: Router = express.Router();
const store = new AdvertisementRequestStoreService();
const ingestion = new AdvertisementRequestIngestionService(store);
const MAX_IMPORT_RECORDS = 100;
const MAX_SPREADSHEET_BYTES = 1_000_000;
const MAX_ASSET_BYTES = 50 * 1024 * 1024;
const ASSET_CATEGORIES = new Set<AssetCategory>([
    'logo',
    'backgroundImage',
    'productImage',
    'backgroundVideo',
    'additional',
]);
const ASSET_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toEnvelope = (body: unknown): AdvertisementIngestionEnvelope => {
    const record = isRecord(body) ? body : {};
    const input = isRecord(record['input']) ? record['input'] : record;
    const rawContext = isRecord(record['context']) ? record['context'] : {};
    const source = ['form', 'import', 'api'].includes(String(rawContext['source']))
        ? (rawContext['source'] as AdvertisementIngestionEnvelope['context']['source'])
        : 'api';
    return {
        input: input as unknown as AdvertisementIngestionEnvelope['input'],
        context: {
            source,
            ...(typeof rawContext['provider'] === 'string'
                ? { provider: rawContext['provider'] }
                : {}),
            ...(typeof rawContext['externalId'] === 'string'
                ? { externalId: rawContext['externalId'] }
                : {}),
        },
        ...(typeof record['idempotencyKey'] === 'string'
            ? { idempotencyKey: record['idempotencyKey'] }
            : {}),
    };
};

const importRecords = (body: unknown): unknown[] => {
    const record = isRecord(body) ? body : {};
    const records = Array.isArray(record['records'])
        ? record['records']
        : record['record'] !== undefined
          ? [record['record']]
          : [];
    return records;
};

const hasRequestShape = (value: unknown): value is AdvertisementRequest => {
    if (!value || typeof value !== 'object') return false;
    const request = value as Partial<AdvertisementRequest>;
    return (
        typeof request.businessName === 'string' &&
        request.businessName.trim().length > 0 &&
        typeof request.dealerNumber === 'string' &&
        request.dealerNumber.trim().length > 0 &&
        typeof request.dealerEmail === 'string' &&
        request.dealerEmail.includes('@') &&
        Boolean(request.contactInformation) &&
        Boolean(request.outsideAd) &&
        Boolean(request.insideAd) &&
        Boolean(request.verticalAds) &&
        Array.isArray(request.assets)
    );
};

const toRequest = (body: AdvertisementRequest, id?: string): AdvertisementRequest => {
    const now = new Date().toISOString();
    const safeId =
        id ||
        (/^REQ-[A-Z0-9-]{4,48}$/i.test(body.id || '')
            ? body.id
            : `REQ-${randomUUID().slice(0, 8).toUpperCase()}`);
    return {
        ...body,
        id: safeId,
        businessName: body.businessName.trim().slice(0, 160),
        dealerNumber: body.dealerNumber.trim().slice(0, 80),
        dealerEmail: body.dealerEmail.trim().slice(0, 254),
        createdAt: body.createdAt || now,
        updatedAt: now,
    };
};

router.get('/', async (_req: Request, res: Response) => {
    try {
        const requests = await store.getAll();
        const hydrated = await Promise.all(
            requests.map(async (request) => ({
                ...request,
                assets: await Promise.all(
                    request.assets.map(async (asset) => {
                        try {
                            return await supabaseStorageService.refreshAssetUrl(asset);
                        } catch {
                            return asset;
                        }
                    }),
                ),
            })),
        );
        res.json({ data: hydrated });
    } catch (error) {
        console.error('[Advertisement Requests] Unable to list requests', error);
        res.status(500).json({
            error: 'request_list_failed',
            errorDescription: 'Unable to load advertisement requests.',
        });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const result = await ingestion.ingest(toEnvelope(req.body));
        res.status(result.duplicate ? 200 : 201).json({
            data: result.request,
            duplicate: result.duplicate,
        });
    } catch (error) {
        if (error instanceof AdvertisementInputError) {
            res.status(422).json({
                error: 'invalid_request',
                errorDescription: 'The advertisement brief needs review.',
                issues: error.issues,
            });
            return;
        }
        const conflict = (error as Error).message === 'REQUEST_ID_EXISTS';
        res.status(conflict ? 409 : 500).json({
            error: conflict ? 'request_exists' : 'request_create_failed',
            errorDescription: conflict
                ? 'This advertisement request already exists.'
                : 'Unable to save the advertisement request.',
        });
    }
});

router.post('/imports/preview', (req: Request, res: Response) => {
    const records = importRecords(req.body);
    if (!records.length) {
        res.status(400).json({
            error: 'empty_import',
            errorDescription: 'Provide at least one record to import.',
        });
        return;
    }
    if (records.length > MAX_IMPORT_RECORDS) {
        res.status(413).json({
            error: 'import_too_large',
            errorDescription: `Import at most ${MAX_IMPORT_RECORDS} records at a time.`,
        });
        return;
    }
    res.json({ data: ingestion.preview(records) });
});

router.post('/imports/google-sheet', async (req: Request, res: Response) => {
    const body = isRecord(req.body) ? req.body : {};
    const rawUrl = typeof body['url'] === 'string' ? body['url'].trim() : '';
    let sheetUrl: URL;

    try {
        sheetUrl = new URL(rawUrl);
    } catch {
        res.status(400).json({
            error: 'invalid_google_sheet_url',
            errorDescription: 'Enter a complete Google Sheets URL.',
        });
        return;
    }

    const match = sheetUrl.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
    if (sheetUrl.protocol !== 'https:' || sheetUrl.hostname !== 'docs.google.com' || !match) {
        res.status(400).json({
            error: 'invalid_google_sheet_url',
            errorDescription: 'Only public docs.google.com spreadsheet links can be imported.',
        });
        return;
    }

    const spreadsheetId = match[1];
    const gid =
        sheetUrl.searchParams.get('gid') ??
        new URLSearchParams(sheetUrl.hash.slice(1)).get('gid') ??
        '0';
    const exportUrl = new URL(
        `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export`,
    );
    exportUrl.searchParams.set('format', 'csv');
    exportUrl.searchParams.set('gid', /^\d+$/.test(gid) ? gid : '0');

    try {
        const response = await fetch(exportUrl, {
            headers: { Accept: 'text/csv' },
            signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
            res.status(response.status === 401 || response.status === 403 ? 403 : 502).json({
                error: 'google_sheet_unavailable',
                errorDescription:
                    'The Google Sheet could not be read. Confirm that anyone with the link can view it.',
            });
            return;
        }
        const csv = await response.text();
        if (!csv.trim()) {
            res.status(422).json({
                error: 'empty_google_sheet',
                errorDescription: 'The selected Google Sheet tab is empty.',
            });
            return;
        }
        if (Buffer.byteLength(csv, 'utf8') > MAX_SPREADSHEET_BYTES) {
            res.status(413).json({
                error: 'google_sheet_too_large',
                errorDescription: 'Import a Google Sheet smaller than 1 MB.',
            });
            return;
        }
        res.json({ data: { csv, spreadsheetId, gid: exportUrl.searchParams.get('gid') } });
    } catch (error) {
        console.error('[Advertisement Requests] Unable to fetch Google Sheet', error);
        res.status(502).json({
            error: 'google_sheet_unavailable',
            errorDescription: 'The Google Sheet could not be fetched right now.',
        });
    }
});

router.post('/imports', async (req: Request, res: Response) => {
    const body = isRecord(req.body) ? req.body : {};
    const records = importRecords(body);
    if (!records.length) {
        res.status(400).json({
            error: 'empty_import',
            errorDescription: 'Provide at least one record to import.',
        });
        return;
    }
    if (records.length > MAX_IMPORT_RECORDS) {
        res.status(413).json({
            error: 'import_too_large',
            errorDescription: `Import at most ${MAX_IMPORT_RECORDS} records at a time.`,
        });
        return;
    }

    const provider = typeof body['provider'] === 'string' ? body['provider'].slice(0, 100) : 'file';
    const prefix =
        typeof body['idempotencyKeyPrefix'] === 'string'
            ? body['idempotencyKeyPrefix'].slice(0, 140)
            : '';
    const results = await Promise.all(
        records.map(async (record, recordIndex) => {
            try {
                const result = await ingestion.ingest({
                    input: record as AdvertisementIngestionEnvelope['input'],
                    context: {
                        source: 'import',
                        provider,
                        ...(isRecord(record) && typeof record['externalId'] === 'string'
                            ? { externalId: record['externalId'] }
                            : {}),
                    },
                    ...(prefix ? { idempotencyKey: `${prefix}:${recordIndex}` } : {}),
                });
                return {
                    recordIndex,
                    success: true as const,
                    duplicate: result.duplicate,
                    data: result.request,
                };
            } catch (error) {
                if (error instanceof AdvertisementInputError) {
                    return {
                        recordIndex,
                        success: false as const,
                        issues: error.issues,
                    };
                }
                throw error;
            }
        }),
    );
    const failed = results.filter((result) => !result.success).length;
    const duplicates = results.filter((result) => result.success && result.duplicate).length;
    res.status(failed ? 207 : 201).json({
        data: results,
        summary: {
            total: results.length,
            created: results.length - failed - duplicates,
            duplicates,
            failed,
        },
    });
});

router.post(
    '/:id/assets',
    express.raw({ type: [...ASSET_TYPES], limit: MAX_ASSET_BYTES }),
    async (req: Request, res: Response) => {
        try {
            const id = String(req.params['id']);
            const existing = await store.getById(id);
            if (!existing) {
                res.status(404).json({
                    error: 'request_not_found',
                    errorDescription: 'The advertisement request was not found.',
                });
                return;
            }
            const category = String(req.query['category'] ?? '') as AssetCategory;
            const filename = String(req.query['filename'] ?? '').trim();
            const contentType = String(req.headers['content-type'] ?? '')
                .split(';')[0]
                .trim();
            if (!ASSET_CATEGORIES.has(category) || !filename || !ASSET_TYPES.has(contentType)) {
                res.status(400).json({
                    error: 'invalid_asset',
                    errorDescription:
                        'Choose a JPEG, PNG, WebP, GIF, MP4, MOV, or WebM asset and a valid category.',
                });
                return;
            }
            if (!Buffer.isBuffer(req.body) || !req.body.length) {
                res.status(400).json({
                    error: 'empty_asset',
                    errorDescription: 'The selected asset file is empty.',
                });
                return;
            }

            const asset = await supabaseStorageService.upload(
                id,
                category,
                filename,
                contentType,
                req.body,
            );
            const assets =
                category === 'logo'
                    ? [...existing.assets.filter((item) => item.category !== 'logo'), asset]
                    : [...existing.assets, asset];
            const updated = await store.update(id, {
                ...existing,
                assets,
                hasLogo: existing.hasLogo || category === 'logo',
                updatedAt: new Date().toISOString(),
            });
            res.status(201).json({ data: updated, asset });
        } catch (error) {
            const code = (error as Error).message;
            console.error('[Advertisement Requests] Unable to upload asset', code);
            res.status(code === 'SUPABASE_STORAGE_NOT_CONFIGURED' ? 503 : 502).json({
                error:
                    code === 'SUPABASE_STORAGE_NOT_CONFIGURED'
                        ? 'asset_storage_not_configured'
                        : 'asset_upload_failed',
                errorDescription:
                    code === 'SUPABASE_STORAGE_NOT_CONFIGURED'
                        ? 'Supabase Storage is not configured on the server. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
                        : 'The asset could not be uploaded to Supabase Storage.',
            });
        }
    },
);

router.delete('/:id/assets/:assetId', async (req: Request, res: Response) => {
    try {
        const id = String(req.params['id']);
        const assetId = String(req.params['assetId']);
        const existing = await store.getById(id);
        if (!existing) {
            res.status(404).json({
                error: 'request_not_found',
                errorDescription: 'The advertisement request was not found.',
            });
            return;
        }
        const asset = existing.assets.find((item) => item.id === assetId);
        if (!asset) {
            res.status(404).json({
                error: 'asset_not_found',
                errorDescription: 'The selected asset was not found.',
            });
            return;
        }

        await supabaseStorageService.delete(asset);
        const assets = existing.assets.filter((item) => item.id !== asset.id);
        const updated = await store.update(id, {
            ...existing,
            assets,
            hasLogo: assets.some((item) => item.category === 'logo'),
            updatedAt: new Date().toISOString(),
        });
        res.json({ data: updated });
    } catch (error) {
        const code = (error as Error).message;
        console.error('[Advertisement Requests] Unable to delete asset', code);
        res.status(code === 'SUPABASE_STORAGE_NOT_CONFIGURED' ? 503 : 502).json({
            error:
                code === 'SUPABASE_STORAGE_NOT_CONFIGURED'
                    ? 'asset_storage_not_configured'
                    : 'asset_delete_failed',
            errorDescription:
                code === 'SUPABASE_STORAGE_NOT_CONFIGURED'
                    ? 'Supabase Storage is not configured on the server.'
                    : 'The asset could not be removed from Supabase Storage.',
        });
    }
});

router.patch('/:id', async (req: Request, res: Response) => {
    try {
        if (!hasRequestShape(req.body)) {
            res.status(400).json({
                error: 'invalid_request',
                errorDescription: 'The advertisement brief is incomplete.',
            });
            return;
        }
        const id = String(req.params['id']);
        const existing = await store.getById(id);
        if (!existing) {
            const request = await store.create(toRequest(req.body, id));
            res.status(201).json({ data: request });
            return;
        }
        const request = await store.update(
            id,
            toRequest({ ...existing, ...req.body, ingestion: existing.ingestion }, id),
        );
        res.json({ data: request });
    } catch (error) {
        console.error('[Advertisement Requests] Unable to update request', error);
        res.status(500).json({
            error: 'request_update_failed',
            errorDescription: 'Unable to update the advertisement request.',
        });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await store.delete(String(req.params['id']));
        res.status(204).send();
    } catch (error) {
        console.error('[Advertisement Requests] Unable to delete request', error);
        res.status(500).json({
            error: 'request_delete_failed',
            errorDescription: 'Unable to delete the advertisement request.',
        });
    }
});

export default router;
