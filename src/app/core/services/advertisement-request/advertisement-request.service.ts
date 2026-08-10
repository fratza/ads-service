import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
    AdvertisementAsset,
    AdvertisementIngestionEnvelope,
    AdvertisementInputContext,
    AdvertisementRequest,
    AdvertisementRequestInput,
    AdvertisementStatus,
    AssetCategory,
} from '@core/models';
import { StorageService } from '@core/services/storage/storage.service';
import { firstValueFrom } from 'rxjs';

const REQUESTS_KEY = 'ntv-advertisement-requests';

const message = (headline: string, index: number) => ({
    id: `msg-${index}-${headline.slice(0, 3)}`,
    slideNumber: index + 1,
    headline,
    supportingText: index === 0 ? 'Made fresh and served with genuine hospitality.' : '',
    displayDuration: 5,
    sortOrder: index + 1,
});

const makeRequest = (
    id: string,
    businessName: string,
    dealerNumber: string,
    status: AdvertisementStatus,
    daysAgo: number,
    adTypes: string[],
): AdvertisementRequest => {
    const updated = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    const outside = adTypes.includes('Outside');
    const inside = adTypes.includes('Inside');
    const vertical = adTypes.includes('Vertical');
    return {
        id,
        dealerNumber,
        dealerEmail: `creative@${businessName.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        businessName,
        generalAdLength: 20,
        hasLogo: true,
        likesCurrentWebsite: true,
        highlights: 'Local favorite with a welcoming atmosphere and loyal customers.',
        fileShareLink: '',
        contactInformation: {
            website: `https://${businessName.toLowerCase().replace(/[^a-z]/g, '')}.com`,
            phone: '(713) 555-0128',
            address: 'Houston, TX',
            socialMedia: '@localbusiness',
            generateQrCode: true,
            included: ['website', 'phone'],
        },
        outsideAd: {
            enabled: outside,
            length: outside ? 15 : null,
            contactOptions: ['website', 'phone'],
            messages: outside
                ? [message('Fresh flavor is waiting', 0), message('Visit us today', 1)]
                : [],
        },
        insideAd: {
            enabled: inside,
            length: inside ? 30 : null,
            contactOptions: ['website'],
            messages: inside ? [message('Make it a combo', 0)] : [],
        },
        verticalAds: {
            enabled: vertical,
            quantity: vertical ? 1 : 0,
            contactOptions: ['website'],
            variations: vertical
                ? [
                      {
                          id: `v-${id}`,
                          variationNumber: 1,
                          headline: 'Your new favorite',
                          message: 'Stop in today',
                          supportingText: 'Local. Fresh. Ready.',
                          aspectRatio: '9:16',
                          sortOrder: 1,
                      },
                  ]
                : [],
        },
        assets: [],
        status,
        createdAt: new Date(Date.now() - (daysAgo + 3) * 86_400_000).toISOString(),
        updatedAt: updated,
    };
};

const MOCK_REQUESTS: AdvertisementRequest[] = [
    makeRequest('REQ-1048', 'The Distinguished Beast', '515SSD', 'ready', 0, [
        'Outside',
        'Inside',
        'Vertical',
    ]),
    makeRequest('REQ-1047', 'Molina’s Cantina', '204HOU', 'rendering', 1, ['Outside', 'Inside']),
    makeRequest('REQ-1046', 'Verdine Kitchen', '119VGN', 'completed', 2, ['Vertical']),
    makeRequest('REQ-1045', 'Bayou City Cycles', '882BCC', 'draft', 3, ['Outside']),
    makeRequest('REQ-1044', 'North Loop Dental', '410NLD', 'failed', 4, ['Inside', 'Vertical']),
    makeRequest('REQ-1043', 'Juniper Coffee Co.', '702JCC', 'submitted', 5, [
        'Outside',
        'Vertical',
    ]),
    makeRequest('REQ-1042', 'Memorial Pet Care', '375MPC', 'queued', 7, ['Inside']),
    makeRequest('REQ-1041', 'Cedar & Stone', '621CAS', 'completed', 9, ['Outside', 'Inside']),
    makeRequest('REQ-1040', 'Heights Hardware', '907HHW', 'cancelled', 11, ['Outside']),
    makeRequest('REQ-1039', 'Rosemont Florals', '244RSF', 'draft', 13, ['Vertical']),
];

@Injectable({ providedIn: 'root' })
export class AdvertisementRequestService {
    private readonly storage = inject(StorageService);
    private readonly http = inject(HttpClient);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly state = signal<AdvertisementRequest[]>(
        this.storage.get<AdvertisementRequest[]>(REQUESTS_KEY) ?? MOCK_REQUESTS,
    );
    readonly requests = this.state.asReadonly();
    readonly total = computed(() => this.state().length);

    constructor() {
        if (isPlatformBrowser(this.platformId)) this.loadSharedRequests();
    }

    getById(id: string): AdvertisementRequest | undefined {
        return this.state().find((request) => request.id === id);
    }

    mergeImported(requests: AdvertisementRequest[]): void {
        if (!requests.length) return;
        const importedIds = new Set(requests.map((request) => request.id));
        this.updateState([
            ...requests,
            ...this.state().filter((request) => !importedIds.has(request.id)),
        ]);
    }

    async create(
        input: AdvertisementRequestInput,
        options: {
            context?: AdvertisementInputContext;
            idempotencyKey?: string;
        } = {},
    ): Promise<AdvertisementRequest> {
        const envelope: AdvertisementIngestionEnvelope = {
            input,
            context: options.context ?? { source: 'form' },
            ...(options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
        };
        const response = await firstValueFrom(
            this.http.post<{ data: AdvertisementRequest }>('/api/advertisement-requests', envelope),
        );
        const created = response.data;
        this.updateState([created, ...this.state().filter((item) => item.id !== created.id)]);
        return created;
    }

    async update(
        id: string,
        input: AdvertisementRequestInput,
    ): Promise<AdvertisementRequest | undefined> {
        const existing = this.getById(id);
        if (!existing) return undefined;
        const updated = { ...existing, ...input, id, updatedAt: new Date().toISOString() };
        const response = await firstValueFrom(
            this.http.patch<{ data: AdvertisementRequest }>(
                `/api/advertisement-requests/${encodeURIComponent(id)}`,
                updated,
            ),
        );
        const saved = response.data;
        this.updateState(this.state().map((request) => (request.id === id ? saved : request)));
        return saved;
    }

    async uploadAsset(
        requestId: string,
        file: File,
        category: AssetCategory,
    ): Promise<AdvertisementAsset> {
        const params = new HttpParams().set('category', category).set('filename', file.name);
        const response = await firstValueFrom(
            this.http.post<{ data: AdvertisementRequest; asset: AdvertisementAsset }>(
                `/api/advertisement-requests/${encodeURIComponent(requestId)}/assets`,
                file,
                {
                    params,
                    headers: { 'Content-Type': file.type || 'application/octet-stream' },
                },
            ),
        );
        this.updateState(
            this.state().map((request) =>
                request.id === response.data.id ? response.data : request,
            ),
        );
        return response.asset;
    }

    async removeAsset(requestId: string, assetId: string): Promise<AdvertisementRequest> {
        const response = await firstValueFrom(
            this.http.delete<{ data: AdvertisementRequest }>(
                `/api/advertisement-requests/${encodeURIComponent(requestId)}/assets/${encodeURIComponent(assetId)}`,
            ),
        );
        this.updateState(
            this.state().map((request) =>
                request.id === response.data.id ? response.data : request,
            ),
        );
        return response.data;
    }

    updateStatus(id: string, status: AdvertisementStatus): void {
        const existing = this.getById(id);
        if (!existing) return;
        const updated = { ...existing, status, updatedAt: new Date().toISOString() };
        this.updateState(this.state().map((request) => (request.id === id ? updated : request)));
        this.http
            .patch(`/api/advertisement-requests/${encodeURIComponent(id)}`, updated)
            .subscribe({ error: () => undefined });
    }

    delete(id: string): void {
        this.updateState(this.state().filter((request) => request.id !== id));
        this.http
            .delete(`/api/advertisement-requests/${encodeURIComponent(id)}`)
            .subscribe({ error: () => undefined });
    }

    async duplicate(id: string): Promise<AdvertisementRequest | undefined> {
        const source = this.getById(id);
        if (!source) return undefined;
        return this.create({
            ...source,
            businessName: `${source.businessName} (Copy)`,
            status: 'draft',
        });
    }

    private loadSharedRequests(): void {
        this.http.get<{ data: AdvertisementRequest[] }>('/api/advertisement-requests').subscribe({
            next: ({ data }) => {
                const remoteIds = new Set(data.map((request) => request.id));
                const merged = [
                    ...data,
                    ...this.state().filter((request) => !remoteIds.has(request.id)),
                ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
                this.updateState(merged);
            },
            error: () => undefined,
        });
    }

    private updateState(requests: AdvertisementRequest[]): void {
        this.state.set(requests);
        this.storage.set(REQUESTS_KEY, requests);
    }
}
