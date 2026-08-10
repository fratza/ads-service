import { Injectable } from '@angular/core';
import { AdvertisementRequestInput } from '@core/models';

export interface CreatomatePayloadPreview {
    workflow: {
        stage: 'creative-brief';
        destination: 'creatomate';
        readyForTemplateMapping: boolean;
        sendsData: false;
    };
    request: {
        businessName: string;
        dealerNumber: string;
        dealerEmail: string;
        generalAdLength: number | null;
        highlights: string;
    };
    brand: {
        hasLogo: boolean;
        likesCurrentWebsite: boolean | null;
        fileShareLink: string;
    };
    contact: {
        included: string[];
        website: string;
        phone: string;
        address: string;
        socialMedia: string;
        generateQrCode: boolean;
    };
    renderPlan: {
        outside: AdvertisementRequestInput['outsideAd'];
        inside: AdvertisementRequestInput['insideAd'];
        vertical: AdvertisementRequestInput['verticalAds'];
    };
    assets: Array<{ category: string; name: string; type: string }>;
}

@Injectable({ providedIn: 'root' })
export class CreatomatePayloadService {
    createPreview(request: AdvertisementRequestInput): CreatomatePayloadPreview {
        return {
            workflow: {
                stage: 'creative-brief',
                destination: 'creatomate',
                readyForTemplateMapping: request.status === 'ready',
                sendsData: false,
            },
            request: {
                businessName: request.businessName,
                dealerNumber: request.dealerNumber,
                dealerEmail: request.dealerEmail,
                generalAdLength: request.generalAdLength,
                highlights: request.highlights,
            },
            brand: {
                hasLogo: request.hasLogo,
                likesCurrentWebsite: request.likesCurrentWebsite,
                fileShareLink: request.fileShareLink,
            },
            contact: { ...request.contactInformation },
            renderPlan: {
                outside: request.outsideAd,
                inside: request.insideAd,
                vertical: request.verticalAds,
            },
            assets: request.assets.map(({ category, name, type }) => ({ category, name, type })),
        };
    }
}
