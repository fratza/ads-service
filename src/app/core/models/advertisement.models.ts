export type AdvertisementStatus =
    | 'draft'
    | 'ready'
    | 'submitted'
    | 'queued'
    | 'rendering'
    | 'completed'
    | 'failed'
    | 'cancelled';

export type AdvertisementInputSource = 'form' | 'import' | 'api';

export interface AdvertisementIngestionMetadata {
    source: AdvertisementInputSource;
    receivedAt: string;
    provider?: string;
    externalId?: string;
    idempotencyKey?: string;
}

export interface AdvertisementInputContext {
    source: AdvertisementInputSource;
    provider?: string;
    externalId?: string;
}

export interface DealerInformation {
    dealerNumber: string;
    dealerEmail: string;
    generalAdLength: number | null;
    businessName: string;
    hasLogo: boolean;
    likesCurrentWebsite: boolean | null;
    highlights: string;
    fileShareLink: string;
}

export interface ContactInformation {
    website: string;
    phone: string;
    address: string;
    socialMedia: string;
    generateQrCode: boolean;
    included: ContactOption[];
}

export type ContactOption = 'website' | 'phone' | 'address' | 'socialMedia';

export interface AdvertisementMessage {
    id: string;
    slideNumber: number;
    headline: string;
    supportingText: string;
    displayDuration: number;
    sortOrder: number;
}

export interface OutsideAdConfiguration {
    enabled: boolean;
    length: number | null;
    contactOptions: ContactOption[];
    messages: AdvertisementMessage[];
}

export interface InsideAdConfiguration extends OutsideAdConfiguration {}

export interface VerticalAdVariation {
    id: string;
    variationNumber: number;
    headline: string;
    message: string;
    supportingText: string;
    aspectRatio: '9:16';
    sortOrder: number;
}

export interface VerticalAdConfiguration {
    enabled: boolean;
    quantity: number;
    contactOptions: ContactOption[];
    variations: VerticalAdVariation[];
}

export interface AdvertisementAsset {
    id: string;
    category: AssetCategory;
    name: string;
    size: number;
    type: string;
    previewUrl: string;
    storagePath?: string;
    uploadedAt?: string;
    urlExpiresAt?: string;
}

export type AssetCategory =
    | 'logo'
    | 'backgroundImage'
    | 'productImage'
    | 'backgroundVideo'
    | 'additional';

export type MockRenderOutput = 'outside' | 'inside' | 'vertical';
export type MockRenderStatus = 'queued' | 'rendering' | 'completed' | 'failed';

export interface MockCreatomateRenderJob {
    id: string;
    requestId: string;
    output: MockRenderOutput;
    label: string;
    templateId: string;
    status: MockRenderStatus;
    progress: number;
    submittedAt: string;
    completedAt: string | null;
}

export interface AdvertisementRequest extends DealerInformation {
    id: string;
    contactInformation: ContactInformation;
    outsideAd: OutsideAdConfiguration;
    insideAd: InsideAdConfiguration;
    verticalAds: VerticalAdConfiguration;
    assets: AdvertisementAsset[];
    status: AdvertisementStatus;
    createdAt: string;
    updatedAt: string;
    /**
     * Optional for compatibility with requests saved before generalized ingestion
     * was introduced. All newly ingested requests receive this metadata.
     */
    ingestion?: AdvertisementIngestionMetadata;
}

export type AdvertisementRequestInput = Omit<
    AdvertisementRequest,
    'id' | 'createdAt' | 'updatedAt' | 'ingestion'
>;

export interface AdvertisementIngestionEnvelope {
    input: AdvertisementRequestInput;
    context: AdvertisementInputContext;
    idempotencyKey?: string;
}

export interface AdvertisementInputIssue {
    path: string;
    message: string;
}

export interface AdvertisementImportPreview {
    recordIndex: number;
    input: AdvertisementRequestInput;
    valid: boolean;
    issues: AdvertisementInputIssue[];
}
