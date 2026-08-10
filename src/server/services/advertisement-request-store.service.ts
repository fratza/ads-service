import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { AdvertisementRequest } from '../../app/core/models/advertisement.models.js';

const DATA_FILE =
    process.env['ADVERTISEMENT_REQUESTS_DATA_FILE'] ||
    join(process.cwd(), 'data', 'advertisement-requests.json');

let writeQueue: Promise<unknown> = Promise.resolve();

export class AdvertisementRequestStoreService {
    async getAll(): Promise<AdvertisementRequest[]> {
        await writeQueue;
        return this.read();
    }

    async getById(id: string): Promise<AdvertisementRequest | undefined> {
        return (await this.getAll()).find((request) => request.id === id);
    }

    async create(request: AdvertisementRequest): Promise<AdvertisementRequest> {
        return this.mutate((requests) => {
            const existing = requests.find((item) => item.id === request.id);
            if (existing) throw new Error('REQUEST_ID_EXISTS');
            return [request, ...requests];
        }, request);
    }

    async createIdempotent(request: AdvertisementRequest): Promise<{
        request: AdvertisementRequest;
        duplicate: boolean;
    }> {
        const operation = writeQueue.then(async () => {
            const requests = await this.read();
            const key = request.ingestion?.idempotencyKey;
            const existing = key
                ? requests.find((item) => item.ingestion?.idempotencyKey === key)
                : undefined;
            if (existing) return { request: existing, duplicate: true };
            await this.write([request, ...requests]);
            return { request, duplicate: false };
        });
        writeQueue = operation.catch(() => undefined);
        return operation;
    }

    async update(id: string, request: AdvertisementRequest): Promise<AdvertisementRequest> {
        const updated = { ...request, id, updatedAt: new Date().toISOString() };
        return this.mutate(
            (requests) => [updated, ...requests.filter((item) => item.id !== id)],
            updated,
        );
    }

    async delete(id: string): Promise<void> {
        await this.mutate((requests) => requests.filter((item) => item.id !== id));
    }

    private async mutate<T>(
        change: (requests: AdvertisementRequest[]) => AdvertisementRequest[],
        result?: T,
    ): Promise<T> {
        const operation = writeQueue.then(async () => {
            const requests = change(await this.read());
            await this.write(requests);
            return result as T;
        });
        writeQueue = operation.catch(() => undefined);
        return operation;
    }

    private async read(): Promise<AdvertisementRequest[]> {
        try {
            const value = JSON.parse(await readFile(DATA_FILE, 'utf8')) as unknown;
            return Array.isArray(value) ? (value as AdvertisementRequest[]) : [];
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
            throw error;
        }
    }

    private async write(requests: AdvertisementRequest[]): Promise<void> {
        await mkdir(dirname(DATA_FILE), { recursive: true });
        const temporaryFile = `${DATA_FILE}.tmp`;
        await writeFile(temporaryFile, JSON.stringify(requests, null, 2), 'utf8');
        await rename(temporaryFile, DATA_FILE);
    }
}
