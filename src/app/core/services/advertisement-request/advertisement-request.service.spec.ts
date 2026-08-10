import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdvertisementRequest } from '@core/models';
import { AdvertisementRequestService } from './advertisement-request.service';

describe('AdvertisementRequestService', () => {
    let service: AdvertisementRequestService;
    let http: HttpTestingController;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                AdvertisementRequestService,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(AdvertisementRequestService);
        http = TestBed.inject(HttpTestingController);
        http.expectOne('/api/advertisement-requests').flush({ data: [] });
    });

    afterEach(() => http.verify());

    it('makes an imported request available before navigating to its detail route', () => {
        const imported = {
            id: 'REQ-IMPORTED',
            updatedAt: new Date().toISOString(),
        } as unknown as AdvertisementRequest;

        service.mergeImported([imported]);

        expect(service.getById(imported.id)).toBe(imported);
    });

    it('uploads an asset and refreshes the request state from the server response', async () => {
        const imported = {
            id: 'REQ-IMPORTED',
            assets: [],
            updatedAt: new Date().toISOString(),
        } as unknown as AdvertisementRequest;
        service.mergeImported([imported]);
        const file = new File(['logo'], 'dealer-logo.png', { type: 'image/png' });
        const uploaded = {
            id: 'asset-1',
            category: 'logo' as const,
            name: file.name,
            size: file.size,
            type: file.type,
            previewUrl: 'https://example.supabase.co/logo.png',
        };

        const uploadPromise = service.uploadAsset(imported.id, file, 'logo');
        const uploadRequest = http.expectOne(
            (request) =>
                request.url === '/api/advertisement-requests/REQ-IMPORTED/assets' &&
                request.params.get('category') === 'logo' &&
                request.params.get('filename') === file.name,
        );
        expect(uploadRequest.request.method).toBe('POST');
        expect(uploadRequest.request.body).toBe(file);
        uploadRequest.flush({ data: { ...imported, assets: [uploaded] }, asset: uploaded });

        await expectAsync(uploadPromise).toBeResolvedTo(uploaded);
        expect(service.getById(imported.id)?.assets).toEqual([uploaded]);
    });

    it('removes an asset and refreshes the request state from the server response', async () => {
        const asset = { id: 'asset-1' };
        const imported = {
            id: 'REQ-IMPORTED',
            assets: [asset],
            updatedAt: new Date().toISOString(),
        } as unknown as AdvertisementRequest;
        service.mergeImported([imported]);

        const removePromise = service.removeAsset(imported.id, asset.id);
        const request = http.expectOne('/api/advertisement-requests/REQ-IMPORTED/assets/asset-1');
        expect(request.request.method).toBe('DELETE');
        request.flush({ data: { ...imported, assets: [] } });

        await expectAsync(removePromise).toBeResolvedTo(jasmine.objectContaining({ assets: [] }));
        expect(service.getById(imported.id)?.assets).toEqual([]);
    });
});
