import { randomUUID } from 'node:crypto';
import {
    AdvertisementAsset,
    AdvertisementImportPreview,
    AdvertisementIngestionEnvelope,
    AdvertisementInputContext,
    AdvertisementInputIssue,
    AdvertisementRequest,
    AdvertisementRequestInput,
    AssetCategory,
    ContactOption,
} from '../../app/core/models/advertisement.models.js';
import { AdvertisementRequestStoreService } from './advertisement-request-store.service.js';

type UnknownRecord = Record<string, unknown>;

const CONTACT_OPTIONS: ContactOption[] = ['website', 'phone', 'address', 'socialMedia'];
const ASSET_CATEGORIES: AssetCategory[] = [
    'logo',
    'backgroundImage',
    'productImage',
    'backgroundVideo',
    'additional',
];
const MAX_TEXT = 2_000;

const isRecord = (value: unknown): value is UnknownRecord =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const text = (value: unknown, max = MAX_TEXT): string =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

const boolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        if (/^(true|yes|y|1)$/i.test(value.trim())) return true;
        if (/^(false|no|n|0)$/i.test(value.trim())) return false;
    }
    return fallback;
};

const nullableBoolean = (value: unknown): boolean | null =>
    value === null || value === undefined || value === '' ? null : boolean(value, false);

const numberOrNull = (value: unknown, fallback: number | null = null): number | null => {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const list = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        return value
            .split(/\r?\n|\s*\|\s*|\s*;\s*/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

const contactOptions = (value: unknown, fallback: ContactOption[]): ContactOption[] => {
    const selected = list(value).filter(
        (item): item is ContactOption =>
            typeof item === 'string' && CONTACT_OPTIONS.includes(item as ContactOption),
    );
    return selected.length ? [...new Set(selected)] : fallback;
};

const message = (value: unknown, index: number) => {
    const record = isRecord(value) ? value : {};
    return {
        id: text(record['id'], 80) || randomUUID(),
        slideNumber: numberOrNull(record['slideNumber'], index + 1) ?? index + 1,
        headline: text(record['headline'] ?? value, 60),
        supportingText: text(record['supportingText'], 120),
        displayDuration: numberOrNull(record['displayDuration'], 5) ?? 5,
        sortOrder: numberOrNull(record['sortOrder'], index + 1) ?? index + 1,
    };
};

const variation = (value: unknown, index: number) => {
    const record = isRecord(value) ? value : {};
    return {
        id: text(record['id'], 80) || randomUUID(),
        variationNumber: numberOrNull(record['variationNumber'], index + 1) ?? index + 1,
        headline: text(record['headline'] ?? value, 60),
        message: text(record['message'], 120),
        supportingText: text(record['supportingText'], 120),
        aspectRatio: '9:16' as const,
        sortOrder: numberOrNull(record['sortOrder'], index + 1) ?? index + 1,
    };
};

const assets = (value: unknown): AdvertisementAsset[] =>
    list(value)
        .filter(isRecord)
        .slice(0, 50)
        .map((asset) => ({
            id: text(asset['id'], 80) || randomUUID(),
            category: ASSET_CATEGORIES.includes(asset['category'] as AssetCategory)
                ? (asset['category'] as AssetCategory)
                : 'additional',
            name: text(asset['name'], 255),
            size: Math.max(0, numberOrNull(asset['size'], 0) ?? 0),
            type: text(asset['type'], 120),
            previewUrl: '',
        }))
        .filter((asset) => asset.name);

const canonicalRecord = (value: UnknownRecord): AdvertisementRequestInput => {
    const contact = isRecord(value['contactInformation']) ? value['contactInformation'] : {};
    const outside = isRecord(value['outsideAd']) ? value['outsideAd'] : {};
    const inside = isRecord(value['insideAd']) ? value['insideAd'] : {};
    const vertical = isRecord(value['verticalAds']) ? value['verticalAds'] : {};

    const outsideMessages = list(outside['messages']).map(message);
    const insideMessages = list(inside['messages']).map(message);
    const variations = list(vertical['variations']).map(variation);

    return {
        dealerNumber: text(value['dealerNumber'], 80),
        dealerEmail: text(value['dealerEmail'], 254),
        generalAdLength: numberOrNull(value['generalAdLength'], 20),
        businessName: text(value['businessName'], 160),
        hasLogo: boolean(value['hasLogo'], false),
        likesCurrentWebsite: nullableBoolean(value['likesCurrentWebsite']),
        highlights: text(value['highlights']),
        fileShareLink: text(value['fileShareLink'], 1_000),
        contactInformation: {
            website: text(contact['website'], 1_000),
            phone: text(contact['phone'], 80),
            address: text(contact['address'], 500),
            socialMedia: text(contact['socialMedia'], 500),
            generateQrCode: boolean(contact['generateQrCode'], false),
            included: contactOptions(contact['included'], []),
        },
        outsideAd: {
            enabled: boolean(outside['enabled'], false),
            length: numberOrNull(outside['length']),
            contactOptions: contactOptions(outside['contactOptions'], []),
            messages: outsideMessages,
        },
        insideAd: {
            enabled: boolean(inside['enabled'], false),
            length: numberOrNull(inside['length']),
            contactOptions: contactOptions(inside['contactOptions'], []),
            messages: insideMessages,
        },
        verticalAds: {
            enabled: boolean(vertical['enabled'], false),
            quantity: numberOrNull(vertical['quantity'], variations.length) ?? variations.length,
            contactOptions: contactOptions(vertical['contactOptions'], []),
            variations,
        },
        assets: assets(value['assets']),
        status: value['status'] === 'draft' ? 'draft' : 'ready',
    };
};

const spreadsheetRecord = (value: UnknownRecord): AdvertisementRequestInput => {
    const website = text(value['website'], 1_000);
    const phone = text(value['phone'], 80);
    const address = text(value['address'], 500);
    const included: ContactOption[] = [
        ...(website ? (['website'] as ContactOption[]) : []),
        ...(phone ? (['phone'] as ContactOption[]) : []),
        ...(address ? (['address'] as ContactOption[]) : []),
    ];
    const outsideMessages = list(value['outsideMessages']).map(message);
    const insideMessages = list(value['insideMessages']).map(message);
    const verticalMessages = list(value['verticalMessages']).map(variation);

    return {
        dealerNumber: text(value['dealerNumber'], 80),
        dealerEmail: text(value['dealerEmail'], 254),
        generalAdLength: numberOrNull(value['generalAdLength'], 20),
        businessName: text(value['businessName'], 160),
        hasLogo: boolean(value['hasLogo'], false),
        likesCurrentWebsite: nullableBoolean(value['likesCurrentWebsite']),
        highlights: text(value['highlights']),
        fileShareLink: text(value['fileShareLink'], 1_000),
        contactInformation: {
            website,
            phone,
            address,
            socialMedia: text(value['socialMedia'], 500),
            generateQrCode: boolean(value['generateQrCode'], false),
            included,
        },
        outsideAd: {
            enabled: boolean(value['generateOutsideAd'], outsideMessages.length > 0),
            length: numberOrNull(value['outsideAdLength']),
            contactOptions: included,
            messages: outsideMessages,
        },
        insideAd: {
            enabled: boolean(value['generateInsideAd'], insideMessages.length > 0),
            length: numberOrNull(value['insideAdLength']),
            contactOptions: included,
            messages: insideMessages,
        },
        verticalAds: {
            enabled: boolean(value['generateVerticalAds'], verticalMessages.length > 0),
            quantity:
                numberOrNull(value['verticalQuantity'], verticalMessages.length) ??
                verticalMessages.length,
            contactOptions: included,
            variations: verticalMessages,
        },
        assets: [],
        status: 'ready',
    };
};

export const normalizeAdvertisementInput = (value: unknown): AdvertisementRequestInput => {
    const record = isRecord(value) ? value : {};
    return isRecord(record['contactInformation']) || isRecord(record['outsideAd'])
        ? canonicalRecord(record)
        : spreadsheetRecord(record);
};

export const validateAdvertisementInput = (
    input: AdvertisementRequestInput,
): AdvertisementInputIssue[] => {
    const issues: AdvertisementInputIssue[] = [];
    const required = (path: string, value: string, label: string) => {
        if (!value.trim()) issues.push({ path, message: `${label} is required.` });
    };

    required('dealerNumber', input.dealerNumber, 'Dealer number');
    required('dealerEmail', input.dealerEmail, 'Dealer email');
    required('businessName', input.businessName, 'Business name');
    if (input.dealerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.dealerEmail)) {
        issues.push({ path: 'dealerEmail', message: 'Dealer email must be valid.' });
    }
    const included = input.contactInformation.included;
    for (const option of included) {
        if (!input.contactInformation[option].trim()) {
            issues.push({
                path: `contactInformation.${option}`,
                message: `${option === 'socialMedia' ? 'Social media' : option} is selected but empty.`,
            });
        }
    }
    if (input.contactInformation.generateQrCode && !input.contactInformation.website.trim()) {
        issues.push({
            path: 'contactInformation.website',
            message: 'Website is required when generating a QR code.',
        });
    }
    if (input.outsideAd.enabled && input.outsideAd.length === null) {
        issues.push({ path: 'outsideAd.length', message: 'Outside ad length is required.' });
    }
    if (input.outsideAd.enabled && !input.outsideAd.messages.length) {
        issues.push({ path: 'outsideAd.messages', message: 'Add at least one outside message.' });
    }
    if (input.insideAd.enabled && input.insideAd.length === null) {
        issues.push({ path: 'insideAd.length', message: 'Inside ad length is required.' });
    }
    if (input.insideAd.enabled && !input.insideAd.messages.length) {
        issues.push({ path: 'insideAd.messages', message: 'Add at least one inside message.' });
    }
    for (const [section, messages] of [
        ['outsideAd', input.outsideAd.messages],
        ['insideAd', input.insideAd.messages],
    ] as const) {
        messages.forEach((item, index) => {
            if (!item.headline.trim()) {
                issues.push({
                    path: `${section}.messages.${index}.headline`,
                    message: `${section === 'outsideAd' ? 'Outside' : 'Inside'} message ${index + 1} needs a headline.`,
                });
            }
            if (item.displayDuration < 1) {
                issues.push({
                    path: `${section}.messages.${index}.displayDuration`,
                    message: `${section === 'outsideAd' ? 'Outside' : 'Inside'} message ${index + 1} needs a valid duration.`,
                });
            }
        });
    }
    if (input.verticalAds.enabled && !input.verticalAds.variations.length) {
        issues.push({
            path: 'verticalAds.variations',
            message: 'Add at least one vertical variation.',
        });
    }
    if (
        input.verticalAds.enabled &&
        input.verticalAds.quantity !== input.verticalAds.variations.length
    ) {
        issues.push({
            path: 'verticalAds.quantity',
            message: 'Vertical quantity must match the number of variations.',
        });
    }
    input.verticalAds.variations.forEach((item, index) => {
        if (!item.headline.trim()) {
            issues.push({
                path: `verticalAds.variations.${index}.headline`,
                message: `Vertical variation ${index + 1} needs a headline.`,
            });
        }
    });
    return issues;
};

export class AdvertisementInputError extends Error {
    constructor(readonly issues: AdvertisementInputIssue[]) {
        super('INVALID_ADVERTISEMENT_INPUT');
    }
}

export class AdvertisementRequestIngestionService {
    constructor(private readonly store = new AdvertisementRequestStoreService()) {}

    preview(records: unknown[]): AdvertisementImportPreview[] {
        return records.map((record, recordIndex) => {
            const input = normalizeAdvertisementInput(record);
            const issues = validateAdvertisementInput(input);
            return { recordIndex, input, valid: issues.length === 0, issues };
        });
    }

    async ingest(envelope: AdvertisementIngestionEnvelope): Promise<{
        request: AdvertisementRequest;
        duplicate: boolean;
    }> {
        const input = normalizeAdvertisementInput(envelope.input);
        const issues = validateAdvertisementInput(input);
        if (issues.length) throw new AdvertisementInputError(issues);

        const idempotencyKey = text(envelope.idempotencyKey, 160);

        const now = new Date().toISOString();
        const context = this.normalizeContext(envelope.context);
        const request: AdvertisementRequest = {
            ...input,
            id: `REQ-${randomUUID().slice(0, 8).toUpperCase()}`,
            createdAt: now,
            updatedAt: now,
            ingestion: {
                ...context,
                receivedAt: now,
                ...(idempotencyKey ? { idempotencyKey } : {}),
            },
        };
        if (idempotencyKey) return this.store.createIdempotent(request);
        return { request: await this.store.create(request), duplicate: false };
    }

    private normalizeContext(context: AdvertisementInputContext): AdvertisementInputContext {
        const source = ['form', 'import', 'api'].includes(context?.source) ? context.source : 'api';
        return {
            source,
            ...(text(context?.provider, 100) ? { provider: text(context.provider, 100) } : {}),
            ...(text(context?.externalId, 160)
                ? { externalId: text(context.externalId, 160) }
                : {}),
        };
    }
}
