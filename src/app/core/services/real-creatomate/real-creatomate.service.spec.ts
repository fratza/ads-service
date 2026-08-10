import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdvertisementRequest } from '@core/models';
import { RealCreatomateService } from './real-creatomate.service';

const request = {
    id: 'REQ-IMPORT',
    dealerNumber: '44NTV-SHD',
    dealerEmail: 'dealer@example.com',
    businessName: 'Nick Fugarino Roofing',
    generalAdLength: 15,
    hasLogo: true,
    likesCurrentWebsite: true,
    highlights: 'Roofing specialists',
    fileShareLink: '',
    contactInformation: {
        website: 'https://roofing.example.com',
        phone: '267-908-7134',
        address: '',
        socialMedia: '',
        generateQrCode: false,
        included: ['website', 'phone'],
    },
    outsideAd: {
        enabled: true,
        length: 15,
        contactOptions: ['website', 'phone'],
        messages: [
            {
                id: 'message-1',
                slideNumber: 1,
                headline: 'Is your roof solid?',
                supportingText: '',
                displayDuration: 5,
                sortOrder: 1,
            },
            {
                id: 'message-2',
                slideNumber: 2,
                headline: 'Give us a call',
                supportingText: '',
                displayDuration: 5,
                sortOrder: 2,
            },
        ],
    },
    insideAd: { enabled: false, length: null, contactOptions: [], messages: [] },
    verticalAds: {
        enabled: false,
        quantity: 0,
        contactOptions: [],
        variations: [],
    },
    assets: [],
    status: 'ready',
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
} satisfies AdvertisementRequest;

describe('RealCreatomateService', () => {
    let service: RealCreatomateService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [RealCreatomateService, provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(RealCreatomateService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('shares one template source request between preview and source viewer', async () => {
        const previewRequest = service.getTemplate('template-123');
        const sourceRequest = service.getTemplate('template-123');

        const templateRequest = http.expectOne('/api/creatomate/templates/template-123');
        templateRequest.flush({
            id: 'template-123',
            name: 'Roofing template',
            tags: [],
            created_at: '2026-08-03T00:00:00.000Z',
            updated_at: '2026-08-03T00:00:00.000Z',
            source: { elements: [] },
        });

        const [preview, source] = await Promise.all([previewRequest, sourceRequest]);
        expect(preview).toBe(source);
        expect(source.source).toEqual({ elements: [] });
    });

    it('maps imported values to the selected template actual dynamic field names', () => {
        const source = {
            elements: [
                { type: 'text', name: 'Company' },
                { type: 'text', name: 'Headline 1' },
                { type: 'text', name: 'Headline 2' },
                { type: 'text', name: 'Website' },
            ],
        };

        expect(service.mapTemplateModifications(source, request)).toEqual({
            Company: 'Nick Fugarino Roofing',
            'Headline 1': 'Is your roof solid?',
            'Headline 2': 'Give us a call',
            Website: 'https://roofing.example.com',
        });
    });

    it('preserves contact labels and maps values to opaque placeholder slots', () => {
        const source = {
            elements: [
                { type: 'text', name: 'Text-8NR', text: 'Phone' },
                { type: 'text', name: 'Text-4JQ', text: 'Address' },
                { type: 'text', name: 'Text-5K4', text: 'Link' },
                { type: 'text', name: 'Text-LRX', text: 'PlaceHolder Phone #' },
                { type: 'text', name: 'Text-2N8', text: 'PlaceHolder Wesite' },
                { type: 'text', name: 'Text-4D5', text: 'PlaceHolder Location' },
                { type: 'text', name: 'Text-XQ6', text: 'Place Holder Image' },
            ],
        };

        expect(service.mapTemplateModifications(source, request)).toEqual({
            'Text-8NR': 'Phone',
            'Text-4JQ': '',
            'Text-5K4': 'Link',
            'Text-LRX': '267-908-7134',
            'Text-2N8': 'https://roofing.example.com',
            'Text-4D5': '',
            'Text-XQ6': '',
        });
    });

    it('preserves validated AI text layout modifications', () => {
        const source = {
            elements: [{ type: 'text', name: 'Headline 1', text: 'Placeholder' }],
        };

        expect(
            service.mapTemplateModifications(source, request, {
                'Headline 1': 'Is your roof\nsolid?',
                'Headline 1.font_size': '11.5 vmin',
                'Headline 1.line_height': '95%',
            }),
        ).toEqual({
            'Headline 1': 'Is your roof\nsolid?',
            'Headline 1.font_size': '11.5 vmin',
            'Headline 1.line_height': '95%',
        });
    });

    it('maps uploaded assets to compatible named image and video elements', () => {
        const source = {
            elements: [
                { type: 'image', name: 'Business Logo', source: 'https://placeholder/image.png' },
                { type: 'image', name: 'Hero Background' },
                { type: 'video', name: 'Background Video' },
            ],
        };
        const requestWithAssets: AdvertisementRequest = {
            ...request,
            assets: [
                {
                    id: 'logo',
                    category: 'logo',
                    name: 'logo.png',
                    size: 100,
                    type: 'image/png',
                    previewUrl: 'https://cdn.example.com/logo.png',
                },
                {
                    id: 'hero',
                    category: 'backgroundImage',
                    name: 'hero.jpg',
                    size: 200,
                    type: 'image/jpeg',
                    previewUrl: 'https://cdn.example.com/hero.jpg',
                },
                {
                    id: 'video',
                    category: 'backgroundVideo',
                    name: 'background.mp4',
                    size: 300,
                    type: 'video/mp4',
                    previewUrl: 'https://cdn.example.com/background.mp4',
                },
            ],
        };

        expect(service.mapTemplateModifications(source, requestWithAssets)).toEqual({
            'Business Logo': 'https://cdn.example.com/logo.png',
            'Hero Background': 'https://cdn.example.com/hero.jpg',
            'Background Video': 'https://cdn.example.com/background.mp4',
        });
    });

    it('sends selected template modifications in the render request', async () => {
        const modifications = {
            Company: 'Nick Fugarino Roofing',
            'Headline 1': 'Is your roof solid?',
            'Headline 1.font_size': '8 vmin',
            'Headline 1.line_height': '100%',
        };
        const renderPromise = service.create(request, 'outside', 'template-123', modifications);
        await Promise.resolve();

        const renderRequest = http.expectOne('/api/creatomate/renders');
        expect(renderRequest.request.body.templateId).toBe('template-123');
        expect(renderRequest.request.body.modifications).toEqual(modifications);
        renderRequest.flush({ id: 'render-1', status: 'waiting' });

        await expectAsync(renderPromise).toBeResolvedTo({ id: 'render-1', status: 'waiting' });
    });

    it('requests GPT-assisted mappings for the selected template source', async () => {
        const source = {
            elements: [{ type: 'text', dynamic: true, name: 'Company' }],
        };
        const mappingPromise = service.suggestTemplateMappings(source, request);
        await Promise.resolve();

        const mappingRequest = http.expectOne('/api/creatomate/template-mappings');
        expect(mappingRequest.request.method).toBe('POST');
        expect(mappingRequest.request.body.templateSource).toEqual({
            width: undefined,
            height: undefined,
            elements: [
                {
                    type: 'text',
                    dynamic: true,
                    name: 'Company',
                    text: '',
                    source: '',
                    x: '',
                    y: '',
                    time: '',
                    track: '',
                    width: '',
                    height: '',
                    font_size: '',
                    line_height: '',
                },
            ],
        });
        expect(mappingRequest.request.body.request).toBe(request);
        mappingRequest.flush({
            model: 'gpt-5.4-nano',
            mappings: [
                {
                    elementName: 'Company',
                    sourcePath: 'businessName',
                    value: 'Nick Fugarino Roofing',
                    confidence: 0.98,
                    reason: 'The field is the business name.',
                    layout: {
                        fontSize: '8 vmin',
                        lineHeight: '100%',
                        reason: 'Fits the available title area.',
                    },
                },
            ],
        });

        const result = await mappingPromise;
        expect(result.model).toBe('gpt-5.4-nano');
        expect(result.mappings[0].sourcePath).toBe('businessName');
    });
});
