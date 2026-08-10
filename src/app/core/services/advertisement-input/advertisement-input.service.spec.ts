import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdvertisementImportPreview } from '@core/models';
import { AdvertisementInputService } from './advertisement-input.service';

describe('AdvertisementInputService', () => {
    let service: AdvertisementInputService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [AdvertisementInputService, provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(AdvertisementInputService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('parses CSV records before requesting an import preview', async () => {
        const contents =
            'Dealer Number,Dealer Email,Business Name,Outside Messages\n' +
            '515SSD,dealer@example.com,Example Dealer,"Headline one|Headline two"';
        const file = {
            name: 'requests.csv',
            text: async () => contents,
        } as File;

        const previewPromise = service.previewFile(file);
        await Promise.resolve();

        const request = http.expectOne('/api/advertisement-requests/imports/preview');
        expect(request.request.method).toBe('POST');
        expect(request.request.body.records).toEqual([
            {
                dealerNumber: '515SSD',
                dealerEmail: 'dealer@example.com',
                businessName: 'Example Dealer',
                outsideMessages: 'Headline one|Headline two',
            },
        ]);

        const response: AdvertisementImportPreview[] = [];
        request.flush({ data: response });
        await expectAsync(previewPromise).toBeResolvedTo(response);
    });

    it('accepts a JSON records envelope', async () => {
        const file = {
            name: 'requests.json',
            text: async () => JSON.stringify({ records: [{ dealerNumber: '515SSD' }] }),
        } as File;

        const previewPromise = service.previewFile(file);
        await Promise.resolve();

        const request = http.expectOne('/api/advertisement-requests/imports/preview');
        expect(request.request.body.records).toEqual([{ dealerNumber: '515SSD' }]);
        request.flush({ data: [] });
        await expectAsync(previewPromise).toBeResolvedTo([]);
    });

    it('converts a vertical Google Sheets questionnaire into an import record', async () => {
        const sheetUrl =
            'https://docs.google.com/spreadsheets/d/1XuP08ddiWXYEL30k3yG5LVXbxaMtOXmdCNY7b_b4tiA/edit?usp=sharing';
        const csv = [
            '44NTVSHD_11ANickFugarinoRoofing,',
            'Dealer # and Acronym,44NTV-SHD',
            'Dealer Email,darren@example.com',
            'Length of Ad,15 Seconds',
            'Name of Business,Nick Fugarino Roofing',
            'Logo,Yes',
            'Phone Number,267-908-7134',
            'Website,PhiladelphiaLocalRoofingCompany.com',
            'Would you like the URL displayed as a QR code?,No',
            'Does client like their website?,Yes',
            'Messaging - MUST BE PROVIDED,"Slide 1 - Is your roof solid?\n\nSlide 2 - Give us a call"',
            'Pictures,Slide 1 - Flat roof and shingles',
            'Google Drive Share Link,https://drive.google.com/example',
        ].join('\n');

        const previewPromise = service.previewGoogleSheet(sheetUrl);
        await Promise.resolve();

        const fetchRequest = http.expectOne('/api/advertisement-requests/imports/google-sheet');
        expect(fetchRequest.request.body).toEqual({ url: sheetUrl });
        fetchRequest.flush({
            data: { csv, spreadsheetId: 'sheet-id', gid: '0' },
        });
        await Promise.resolve();

        const previewRequest = http.expectOne('/api/advertisement-requests/imports/preview');
        expect(previewRequest.request.body.records).toEqual([
            jasmine.objectContaining({
                dealerNumber: '44NTV-SHD',
                dealerEmail: 'darren@example.com',
                generalAdLength: 15,
                outsideAdLength: 15,
                businessName: 'Nick Fugarino Roofing',
                hasLogo: 'Yes',
                phone: '267-908-7134',
                website: 'https://PhiladelphiaLocalRoofingCompany.com',
                generateQrCode: 'No',
                likesCurrentWebsite: 'Yes',
                outsideMessages: 'Is your roof solid?|Give us a call',
                highlights: 'Pictures: Flat roof and shingles',
                fileShareLink: 'https://drive.google.com/example',
            }),
        ]);
        previewRequest.flush({ data: [] });

        await expectAsync(previewPromise).toBeResolvedTo({
            previews: [],
            spreadsheetId: 'sheet-id',
            gid: '0',
        });
    });

    it('imports Google Sheet previews with a stable provider and idempotency key', async () => {
        const importPromise = service.importGoogleSheet([], 'sheet-id', '123');
        await Promise.resolve();

        const request = http.expectOne('/api/advertisement-requests/imports');
        expect(request.request.body).toEqual({
            records: [],
            provider: 'google-sheets',
            idempotencyKeyPrefix: 'sheet-id:123',
        });
        request.flush({ data: [] });
        await expectAsync(importPromise).toBeResolvedTo([]);
    });
});
