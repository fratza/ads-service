import { randomUUID } from 'node:crypto';
import { AdvertisementAsset, AssetCategory } from '../../app/core/models/advertisement.models.js';

const DEFAULT_BUCKET = 'dealer-ads';
const SIGNED_URL_SECONDS = 7 * 24 * 60 * 60;

const cleanSegment = (value: string, fallback: string): string =>
    value
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120) || fallback;

const objectUrl = (
    baseUrl: string,
    action: 'object' | 'sign',
    bucket: string,
    path: string,
): string =>
    `${baseUrl}/storage/v1/object/${action === 'object' ? '' : 'sign/'}${encodeURIComponent(bucket)}/${path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;

export class SupabaseStorageService {
    async delete(asset: AdvertisementAsset): Promise<void> {
        if (!asset.storagePath) return;
        const baseUrl = (process.env['SUPABASE_URL'] ?? '').replace(/\/+$/, '');
        const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
        const bucket = process.env['SUPABASE_STORAGE_BUCKET'] || DEFAULT_BUCKET;
        if (!baseUrl || !serviceKey) throw new Error('SUPABASE_STORAGE_NOT_CONFIGURED');

        const response = await fetch(objectUrl(baseUrl, 'object', bucket, asset.storagePath), {
            method: 'DELETE',
            headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
            },
            signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
            console.error('[Supabase Storage] Delete failed', {
                status: response.status,
                message: (await response.text()).slice(0, 300),
            });
            throw new Error('SUPABASE_STORAGE_DELETE_FAILED');
        }
    }

    async refreshAssetUrl(asset: AdvertisementAsset): Promise<AdvertisementAsset> {
        if (!asset.storagePath) return asset;
        const baseUrl = (process.env['SUPABASE_URL'] ?? '').replace(/\/+$/, '');
        const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
        const bucket = process.env['SUPABASE_STORAGE_BUCKET'] || DEFAULT_BUCKET;
        const isPublic = /^true$/i.test(process.env['SUPABASE_STORAGE_PUBLIC'] ?? 'false');
        if (isPublic && baseUrl) {
            return {
                ...asset,
                previewUrl: this.publicUrl(baseUrl, bucket, asset.storagePath),
                urlExpiresAt: undefined,
            };
        }
        if (!baseUrl || !serviceKey) return asset;

        return {
            ...asset,
            previewUrl: await this.createSignedUrl(baseUrl, serviceKey, bucket, asset.storagePath),
            urlExpiresAt: new Date(Date.now() + SIGNED_URL_SECONDS * 1000).toISOString(),
        };
    }

    async upload(
        requestId: string,
        category: AssetCategory,
        filename: string,
        contentType: string,
        body: Buffer,
    ): Promise<AdvertisementAsset> {
        const baseUrl = (process.env['SUPABASE_URL'] ?? '').replace(/\/+$/, '');
        const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
        const bucket = process.env['SUPABASE_STORAGE_BUCKET'] || DEFAULT_BUCKET;
        const isPublic = /^true$/i.test(process.env['SUPABASE_STORAGE_PUBLIC'] ?? 'false');
        if (!baseUrl || !serviceKey) throw new Error('SUPABASE_STORAGE_NOT_CONFIGURED');

        const safeFilename = cleanSegment(filename, 'asset');
        const path = `${cleanSegment(requestId, 'request')}/${category}/${randomUUID()}-${safeFilename}`;
        const uploadResponse = await fetch(objectUrl(baseUrl, 'object', bucket, path), {
            method: 'POST',
            headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': contentType,
                'x-upsert': 'false',
            },
            body: body.buffer.slice(
                body.byteOffset,
                body.byteOffset + body.byteLength,
            ) as ArrayBuffer,
            signal: AbortSignal.timeout(30_000),
        });
        if (!uploadResponse.ok) {
            console.error('[Supabase Storage] Upload failed', {
                status: uploadResponse.status,
                message: (await uploadResponse.text()).slice(0, 300),
            });
            throw new Error('SUPABASE_STORAGE_UPLOAD_FAILED');
        }

        let previewUrl: string;
        let urlExpiresAt: string | undefined;
        if (isPublic) {
            previewUrl = this.publicUrl(baseUrl, bucket, path);
        } else {
            previewUrl = await this.createSignedUrl(baseUrl, serviceKey, bucket, path);
            urlExpiresAt = new Date(Date.now() + SIGNED_URL_SECONDS * 1000).toISOString();
        }

        return {
            id: randomUUID(),
            category,
            name: filename.slice(0, 255),
            size: body.length,
            type: contentType,
            previewUrl,
            storagePath: path,
            uploadedAt: new Date().toISOString(),
            ...(urlExpiresAt ? { urlExpiresAt } : {}),
        };
    }

    private async createSignedUrl(
        baseUrl: string,
        serviceKey: string,
        bucket: string,
        path: string,
    ): Promise<string> {
        const signedResponse = await fetch(objectUrl(baseUrl, 'sign', bucket, path), {
            method: 'POST',
            headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expiresIn: SIGNED_URL_SECONDS }),
            signal: AbortSignal.timeout(15_000),
        });
        const signedBody = (await signedResponse.json()) as {
            signedURL?: string;
            signedUrl?: string;
        };
        const signedUrl = signedBody.signedURL ?? signedBody.signedUrl;
        if (!signedResponse.ok || !signedUrl) throw new Error('SUPABASE_STORAGE_SIGN_FAILED');
        if (signedUrl.startsWith('http')) return signedUrl;
        return signedUrl.startsWith('/storage/v1/')
            ? `${baseUrl}${signedUrl}`
            : `${baseUrl}/storage/v1/${signedUrl.replace(/^\/+/, '')}`;
    }

    private publicUrl(baseUrl: string, bucket: string, path: string): string {
        return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path
            .split('/')
            .map(encodeURIComponent)
            .join('/')}`;
    }
}

export const supabaseStorageService = new SupabaseStorageService();
