import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AdvertisementRequest, MockRenderOutput } from '@core/models';
import { firstValueFrom } from 'rxjs';

export interface CreatomateRender {
    id: string;
    status: 'planned' | 'waiting' | 'transcribing' | 'rendering' | 'succeeded' | 'failed';
    url?: string;
    snapshot_url?: string;
    error_message?: string;
}

export interface CreatomateTemplate {
    id: string;
    name: string;
    tags: string[];
    created_at: string;
    updated_at: string;
}

export interface CreatomateTemplateDetail extends CreatomateTemplate {
    source: Record<string, unknown>;
}

export interface TemplateMappingSuggestion {
    elementName: string;
    sourcePath: string;
    value: string;
    confidence: number;
    reason: string;
    layout: {
        fontSize: string | null;
        lineHeight: string | null;
        reason: string;
    };
}

export interface TemplateMappingResult {
    model: 'gpt-5.4-nano';
    mappings: TemplateMappingSuggestion[];
}

export interface TemplateJsonEditResult {
    model: string;
    source: Record<string, unknown>;
    summary: string;
    changes: string[];
}

export interface TemplateJsonEditContext {
    selectedElement?: {
        id: string;
        name: string;
        type: string;
    };
}

@Injectable({ providedIn: 'root' })
export class RealCreatomateService {
    private readonly http = inject(HttpClient);
    private previewConfigRequest?: Promise<{ playerToken: string }>;
    private readonly templateDetailRequests = new Map<string, Promise<CreatomateTemplateDetail>>();

    listTemplates(): Promise<CreatomateTemplate[]> {
        return firstValueFrom(this.http.get<CreatomateTemplate[]>('/api/creatomate/templates'));
    }

    getTemplate(id: string): Promise<CreatomateTemplateDetail> {
        const existing = this.templateDetailRequests.get(id);
        if (existing) return existing;
        const request = firstValueFrom(
            this.http.get<CreatomateTemplateDetail>(
                `/api/creatomate/templates/${encodeURIComponent(id)}`,
            ),
        ).catch((error) => {
            this.templateDetailRequests.delete(id);
            throw error;
        });
        this.templateDetailRequests.set(id, request);
        return request;
    }

    mapTemplateModifications(
        source: Record<string, unknown>,
        request: AdvertisementRequest,
        saved: Record<string, string> = {},
    ): Record<string, string> {
        const messages = [...request.outsideAd.messages, ...request.insideAd.messages];
        const headlines = messages.map((message) => message.headline).filter(Boolean);
        if (!headlines.length) {
            headlines.push(
                ...request.verticalAds.variations
                    .map((variation) => variation.headline)
                    .filter(Boolean),
            );
        }
        const firstMessage = messages[0];
        const supportingText =
            firstMessage?.supportingText ||
            request.highlights ||
            request.verticalAds.variations[0]?.supportingText ||
            '';
        const website = request.contactInformation.website;
        const phone = request.contactInformation.phone;
        const callToAction = website
            ? `Visit ${website}`
            : phone
              ? `Call ${phone}`
              : 'Contact us today';
        const modifications: Record<string, string> = {};
        let genericHeadlineIndex = 0;

        const normalized = (value: unknown): string =>
            typeof value === 'string'
                ? value
                      .toLowerCase()
                      .replace(/place\s*holder/g, 'placeholder')
                      .replace(/wesite/g, 'website')
                      .replace(/[^a-z0-9#]+/g, ' ')
                      .trim()
                : '';

        const walk = (value: unknown): void => {
            if (Array.isArray(value)) {
                value.forEach(walk);
                return;
            }
            if (!value || typeof value !== 'object') return;
            const element = value as Record<string, unknown>;
            const elementType = typeof element['type'] === 'string' ? element['type'] : '';
            if (elementType === 'text' && typeof element['name'] === 'string') {
                const name = element['name'];
                const currentText =
                    typeof element['text'] === 'string' ? element['text'].trim() : '';
                const lowerName = normalized(name);
                const lowerText = normalized(currentText);
                const meaning = `${lowerName} ${lowerText}`;
                const numberedField = meaning.match(
                    /(?:offer|product|promo|message|text|headline|title)[^0-9]*(\d+)/,
                );
                const numberedValue =
                    numberedField && headlines.length
                        ? headlines[(Number(numberedField[1]) - 1) % headlines.length]
                        : undefined;
                let mapped: string | undefined;
                const isStaticLabel = /^(phone|telephone|address|location|website|link|url)$/.test(
                    lowerText,
                );
                const isImageInstruction = /placeholder.*image|image.*placeholder/.test(lowerText);
                if (isImageInstruction) mapped = '';
                else if (isStaticLabel) {
                    if (/phone|telephone/.test(lowerText)) mapped = phone ? currentText : '';
                    else if (/website|link|url/.test(lowerText)) {
                        mapped = website ? currentText : '';
                    } else if (/address|location/.test(lowerText)) {
                        mapped = request.contactInformation.address ? currentText : '';
                    }
                } else if (/business|brand|company/.test(meaning)) mapped = request.businessName;
                else if (/call.?to.?action|\bcta\b/.test(meaning)) mapped = callToAction;
                else if (/website|\burl\b|\blink\b/.test(meaning)) mapped = website;
                else if (/phone|telephone/.test(meaning)) mapped = phone;
                else if (/address|location/.test(meaning)) {
                    mapped = request.contactInformation.address;
                } else if (/dealer/.test(meaning)) mapped = request.dealerNumber;
                else if (/secondary|support|description|subtitle|body/.test(meaning)) {
                    mapped = supportingText;
                } else if (numberedValue) mapped = numberedValue;
                else if (/primary|headline|title/.test(meaning)) mapped = headlines[0];
                else if (/placeholder.*text|text.*placeholder/.test(lowerText)) {
                    mapped = headlines[genericHeadlineIndex++] || request.businessName;
                }
                modifications[name] = Object.prototype.hasOwnProperty.call(saved, name)
                    ? saved[name]
                    : mapped !== undefined
                      ? mapped
                      : currentText;
            } else if (
                (elementType === 'image' || elementType === 'video') &&
                typeof element['name'] === 'string'
            ) {
                const name = element['name'];
                const currentSource =
                    typeof element['source'] === 'string' ? element['source'].trim() : '';
                const meaning = normalized(`${name} ${currentSource}`);
                const matchingAssets = request.assets.filter(
                    (asset) =>
                        Boolean(asset.previewUrl) &&
                        (elementType === 'video'
                            ? asset.type.startsWith('video/')
                            : asset.type.startsWith('image/')),
                );
                const preferred = matchingAssets.find((asset) => {
                    if (/logo|brand mark/.test(meaning)) return asset.category === 'logo';
                    if (/product|menu|item/.test(meaning)) return asset.category === 'productImage';
                    if (/background|hero|photo|image/.test(meaning)) {
                        return asset.category === 'backgroundImage';
                    }
                    if (elementType === 'video') return asset.category === 'backgroundVideo';
                    return false;
                });
                const mapped = preferred ?? matchingAssets[0];
                if (Object.prototype.hasOwnProperty.call(saved, name)) {
                    modifications[name] = saved[name];
                } else if (mapped) {
                    modifications[name] = mapped.previewUrl;
                }
            }
            Object.values(element).forEach(walk);
        };
        walk(source);
        Object.entries(saved).forEach(([key, value]) => {
            if (/\.(?:font_size|line_height)$/.test(key)) modifications[key] = value;
        });
        return modifications;
    }

    editTemplateSource(
        source: Record<string, unknown>,
        prompt: string,
        context?: TemplateJsonEditContext,
    ): Promise<TemplateJsonEditResult> {
        return firstValueFrom(
            this.http.post<TemplateJsonEditResult>('/api/creatomate/template-json-edit', {
                source,
                prompt,
                context,
            }),
        );
    }

    getPreviewConfig(): Promise<{ playerToken: string }> {
        this.previewConfigRequest ??= firstValueFrom(
            this.http.get<{ playerToken: string }>('/api/creatomate/preview-config'),
        );
        return this.previewConfigRequest;
    }

    suggestTemplateMappings(
        templateSource: Record<string, unknown>,
        request: AdvertisementRequest,
    ): Promise<TemplateMappingResult> {
        return firstValueFrom(
            this.http.post<TemplateMappingResult>('/api/creatomate/template-mappings', {
                templateSource: this.mappingSource(templateSource),
                request,
            }),
        );
    }

    private mappingSource(source: Record<string, unknown>): Record<string, unknown> {
        const elements: Array<Record<string, unknown>> = [];
        const names = new Set<string>();
        const walk = (value: unknown): void => {
            if (elements.length >= 30) return;
            if (Array.isArray(value)) {
                value.forEach(walk);
                return;
            }
            if (!value || typeof value !== 'object') return;
            const element = value as Record<string, unknown>;
            if (
                ['text', 'image', 'video'].includes(String(element['type'])) &&
                typeof element['name'] === 'string' &&
                !names.has(element['name'])
            ) {
                names.add(element['name']);
                elements.push({
                    name: element['name'].slice(0, 100),
                    type:
                        typeof element['type'] === 'string'
                            ? element['type'].slice(0, 30)
                            : 'unknown',
                    dynamic: element['dynamic'] === true,
                    text: typeof element['text'] === 'string' ? element['text'].slice(0, 180) : '',
                    source:
                        typeof element['source'] === 'string'
                            ? element['source'].slice(0, 300)
                            : '',
                    x: typeof element['x'] === 'string' ? element['x'].slice(0, 30) : '',
                    y: typeof element['y'] === 'string' ? element['y'].slice(0, 30) : '',
                    time:
                        typeof element['time'] === 'number' || typeof element['time'] === 'string'
                            ? element['time']
                            : '',
                    track:
                        typeof element['track'] === 'number' || typeof element['track'] === 'string'
                            ? element['track']
                            : '',
                    width:
                        typeof element['width'] === 'string' ? element['width'].slice(0, 30) : '',
                    height:
                        typeof element['height'] === 'string' ? element['height'].slice(0, 30) : '',
                    font_size:
                        typeof element['font_size'] === 'string'
                            ? element['font_size'].slice(0, 30)
                            : '',
                    line_height:
                        typeof element['line_height'] === 'string'
                            ? element['line_height'].slice(0, 30)
                            : '',
                });
            }
            Object.values(element).forEach(walk);
        };
        walk(source);
        return {
            width: source['width'],
            height: source['height'],
            elements,
        };
    }

    create(
        request: AdvertisementRequest,
        output: MockRenderOutput,
        templateId?: string,
        modifications?: Record<string, string>,
        source?: Record<string, unknown>,
    ): Promise<CreatomateRender> {
        const messages =
            output === 'outside' ? request.outsideAd.messages : request.insideAd.messages;
        const vertical = request.verticalAds.variations[0];
        const headline = output === 'vertical' ? vertical?.headline : messages[0]?.headline;
        const supportingText =
            output === 'vertical'
                ? vertical?.supportingText || vertical?.message
                : messages[0]?.supportingText;
        const contact =
            request.contactInformation.website ||
            request.contactInformation.phone ||
            request.contactInformation.address;
        return firstValueFrom(
            this.http.post<CreatomateRender>('/api/creatomate/renders', {
                requestId: request.id,
                output,
                businessName: request.businessName,
                headline: headline || 'Your message goes here',
                supportingText: supportingText || request.highlights,
                contact,
                templateId,
                modifications,
                source,
            }),
        );
    }

    get(id: string): Promise<CreatomateRender> {
        return firstValueFrom(
            this.http.get<CreatomateRender>(`/api/creatomate/renders/${encodeURIComponent(id)}`),
        );
    }

    errorMessage(error: unknown): string {
        if (error instanceof HttpErrorResponse)
            return error.error?.errorDescription || error.message;
        return error instanceof Error ? error.message : 'Unable to start the Creatomate render.';
    }
}
