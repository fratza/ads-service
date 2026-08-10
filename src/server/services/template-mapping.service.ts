import { AdvertisementRequest } from '../../app/core/models/advertisement.models.js';

const MODEL = 'skillhub:9' as const;
const SKILLHUB_URL = process.env['SKILLHUB_URL'] || 'http://3.219.184.254:4200/api/ai/skills';
const SKILLHUB_ID = '9';
const MAX_DYNAMIC_ELEMENTS = 30;
const MAX_CANDIDATES = 80;
const MAX_VALUE_LENGTH = 500;
const MIN_FONT_SIZE_VMIN = 2;
const MIN_LINE_HEIGHT_PERCENT = 85;
const MAX_LINE_HEIGHT_PERCENT = 130;

interface DynamicTemplateElement {
    name: string;
    type: string;
    currentValue: string;
    x: string;
    y: string;
    time: string;
    track: string;
    width: string;
    height: string;
    autoWidth: boolean;
    autoHeight: boolean;
    wordWrap: string;
    fontSize: string;
    lineHeight: string;
    roleHint: string;
    lockedLabel: boolean;
}

interface MappingCandidate {
    path: string;
    label: string;
    value: string;
}

interface ModelMapping {
    elementName: string;
    sourcePath: string | null;
    confidence: number;
    reason: string;
    formattedValue: string | null;
    fontSizeVmin: number | null;
    lineHeightPercent: number | null;
    layoutReason: string;
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
    model: typeof MODEL;
    mappings: TemplateMappingSuggestion[];
}

const text = (value: unknown, limit = MAX_VALUE_LENGTH): string =>
    typeof value === 'string' ? value.trim().slice(0, limit) : '';

const normalized = (value: string): string =>
    value
        .toLowerCase()
        .replace(/place\s*holder/g, 'placeholder')
        .replace(/wesite/g, 'website')
        .replace(/[^a-z0-9#]+/g, ' ')
        .trim();

const numberIn = (value: string): number | null => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value: number, minimum: number, maximum: number): number =>
    Math.min(maximum, Math.max(minimum, value));

const isAutoDimension = (value: string): boolean => !value || value.trim().toLowerCase() === 'auto';

const formatWebsiteValue = (value: unknown): string => {
    const raw = text(value);
    if (!/^https:\/\//i.test(raw)) return raw;
    const rest = raw.slice(raw.indexOf('://') + 3);
    return /^www\./i.test(rest) ? rest : `www.${rest}`;
};

const sameTextWithDifferentWhitespace = (original: string, formatted: string): boolean =>
    original.replace(/\s/g, '') === formatted.replace(/\s/g, '');

const safeLayout = (
    element: DynamicTemplateElement,
    candidate: MappingCandidate,
    mapping?: ModelMapping,
): { value: string; fontSize: string | null; lineHeight: string | null; reason: string } => {
    const originalFontSize = numberIn(element.fontSize);
    const modelFontSize = mapping?.fontSizeVmin;
    const maximumFontSize = originalFontSize ?? 20;
    const minimumFontSize = Math.min(
        maximumFontSize,
        Math.max(MIN_FONT_SIZE_VMIN, maximumFontSize * 0.45),
    );
    const fallbackScale = Math.sqrt(
        Math.min(
            1,
            Math.max(0.2, Math.max(element.currentValue.length, 8) / candidate.value.length),
        ),
    );
    const lengthSafeMaximum = Math.max(minimumFontSize, maximumFontSize * fallbackScale);
    const recommendedFontSize =
        typeof modelFontSize === 'number' && Number.isFinite(modelFontSize)
            ? modelFontSize
            : lengthSafeMaximum;
    const validatedFontSize = clamp(recommendedFontSize, minimumFontSize, lengthSafeMaximum);
    const fontSize = originalFontSize ? `${Number(validatedFontSize.toFixed(2))} vmin` : null;
    const modelLineHeight = mapping?.lineHeightPercent;
    const lineHeight =
        typeof modelLineHeight === 'number' && Number.isFinite(modelLineHeight)
            ? `${Math.round(
                  clamp(modelLineHeight, MIN_LINE_HEIGHT_PERCENT, MAX_LINE_HEIGHT_PERCENT),
              )}%`
            : null;
    const formatted = text(mapping?.formattedValue, MAX_VALUE_LENGTH);
    const value =
        formatted && sameTextWithDifferentWhitespace(candidate.value, formatted)
            ? formatted
            : candidate.value;
    return {
        value,
        fontSize,
        lineHeight,
        reason:
            recommendedFontSize > lengthSafeMaximum + 0.01
                ? `SkillHub's layout recommendation was reduced to ${fontSize} by the text-length safety limit.`
                : text(mapping?.layoutReason, 240) ||
                  'Applied a validated size based on the template slot and imported text length.',
    };
};

const explicitSourcePath = (
    element: Pick<DynamicTemplateElement, 'name' | 'currentValue' | 'type'>,
): string | null => {
    if (element.type.toLowerCase() !== 'text') return null;
    const name = normalized(element.name);
    const value = normalized(element.currentValue);
    const meaning = `${name} ${value}`;
    const isValueSlot = /placeholder|value|number|#/.test(value) || !value;

    if (/business|company|brand/.test(meaning)) return 'businessName';
    if (isValueSlot && /phone|telephone/.test(meaning)) return 'contactInformation.phone';
    if (isValueSlot && /website|\burl\b|\blink\b/.test(meaning)) {
        return 'contactInformation.website';
    }
    if (isValueSlot && /address|location/.test(meaning)) {
        return 'contactInformation.address';
    }
    return null;
};

const enrichElementRoles = (elements: DynamicTemplateElement[]): DynamicTemplateElement[] => {
    const explicitPaths = new Set(elements.map(explicitSourcePath).filter(Boolean));
    return elements.map((element) => {
        const media = ['image', 'video'].includes(element.type.toLowerCase());
        const value = normalized(element.currentValue);
        const explicitPath = explicitSourcePath(element);
        const labelPath = /^(phone|telephone)$/.test(value)
            ? 'contactInformation.phone'
            : /^(website|link|url)$/.test(value)
              ? 'contactInformation.website'
              : /^(address|location)$/.test(value)
                ? 'contactInformation.address'
                : null;
        const lockedLabel = Boolean(labelPath && explicitPaths.has(labelPath));
        const roleHint = media
            ? `${element.type} media slot; use a compatible uploaded asset, preferring a matching logo, background, or product category`
            : lockedLabel
              ? 'static label; preserve this text and map the value to its separate placeholder'
              : explicitPath
                ? `value slot for ${explicitPath}`
                : /placeholder.*image|image.*placeholder/.test(value)
                  ? 'image instruction; do not replace with imported text'
                  : /placeholder/.test(value)
                    ? 'generic replaceable text slot'
                    : 'unknown text element; map only with strong semantic evidence';
        const sizingHint = media
            ? ''
            : element.autoWidth && element.autoHeight
              ? ' Box auto-resizes to fit its text (width/height are "auto"), so it is safe to leave long values on one line.'
              : element.wordWrap === 'false'
                ? ' Box has a fixed size and word_wrap disabled, so long text will overflow unless you insert manual line breaks in formattedValue.'
                : ' Box has a fixed size, so wrap long text onto multiple lines in formattedValue instead of letting it overflow or shrinking the font too far.';
        return { ...element, roleHint: `${roleHint}${sizingHint}`, lockedLabel };
    });
};

const extractDynamicElements = (source: Record<string, unknown>): DynamicTemplateElement[] => {
    const elements: DynamicTemplateElement[] = [];
    const names = new Set<string>();

    const walk = (value: unknown): void => {
        if (elements.length >= MAX_DYNAMIC_ELEMENTS) return;
        if (Array.isArray(value)) {
            value.forEach(walk);
            return;
        }
        if (!value || typeof value !== 'object') return;
        const element = value as Record<string, unknown>;
        const name = text(element['name'], 100);
        if (
            ['text', 'image', 'video'].includes(String(element['type'])) &&
            name &&
            !names.has(name)
        ) {
            names.add(name);
            const width = text(element['width'], 30);
            const height = text(element['height'], 30);
            elements.push({
                name,
                type: text(element['type'], 30) || 'unknown',
                currentValue: text(element['text'] ?? element['source'], 180),
                x: text(element['x'], 30),
                y: text(element['y'], 30),
                time: String(element['time'] ?? ''),
                track: String(element['track'] ?? ''),
                width,
                height,
                autoWidth: isAutoDimension(width),
                autoHeight: isAutoDimension(height),
                wordWrap:
                    typeof element['word_wrap'] === 'boolean' ? String(element['word_wrap']) : '',
                fontSize: text(element['font_size'], 30),
                lineHeight: text(element['line_height'], 30),
                roleHint: '',
                lockedLabel: false,
            });
        }
        Object.values(element).forEach(walk);
    };

    walk(source);
    return enrichElementRoles(elements);
};

const createCandidates = (request: AdvertisementRequest): MappingCandidate[] => {
    const candidates: MappingCandidate[] = [];
    const add = (path: string, label: string, value: unknown): void => {
        const cleanValue = text(value);
        if (cleanValue && candidates.length < MAX_CANDIDATES) {
            candidates.push({ path, label, value: cleanValue });
        }
    };

    add('businessName', 'Business name', request.businessName);
    add('dealerNumber', 'Dealer number', request.dealerNumber);
    add('highlights', 'Business highlights and notes', request.highlights);
    add(
        'contactInformation.website',
        'Website',
        formatWebsiteValue(request.contactInformation?.website),
    );
    add('contactInformation.phone', 'Phone number', request.contactInformation?.phone);
    add('contactInformation.address', 'Business address', request.contactInformation?.address);
    add(
        'contactInformation.socialMedia',
        'Social media account',
        request.contactInformation?.socialMedia,
    );

    request.outsideAd?.messages?.forEach((message, index) => {
        add(
            `outsideAd.messages[${index}].headline`,
            `Outside ad headline ${index + 1}`,
            message.headline,
        );
        add(
            `outsideAd.messages[${index}].supportingText`,
            `Outside ad supporting text ${index + 1}`,
            message.supportingText,
        );
    });
    request.insideAd?.messages?.forEach((message, index) => {
        add(
            `insideAd.messages[${index}].headline`,
            `Inside ad headline ${index + 1}`,
            message.headline,
        );
        add(
            `insideAd.messages[${index}].supportingText`,
            `Inside ad supporting text ${index + 1}`,
            message.supportingText,
        );
    });
    request.verticalAds?.variations?.forEach((variation, index) => {
        add(
            `verticalAds.variations[${index}].headline`,
            `Vertical ad headline ${index + 1}`,
            variation.headline,
        );
        add(
            `verticalAds.variations[${index}].supportingText`,
            `Vertical ad supporting text ${index + 1}`,
            variation.supportingText || variation.message,
        );
    });
    request.assets?.forEach((asset, index) => {
        add(
            `assets[${index}].previewUrl`,
            `${asset.category} asset: ${asset.name} (${asset.type})`,
            asset.previewUrl,
        );
    });

    return candidates;
};

const parseSkillOutput = (value: unknown): { mappings?: ModelMapping[] } => {
    if (typeof value === 'string') {
        const withoutCodeFence = value
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '');
        try {
            return parseSkillOutput(JSON.parse(withoutCodeFence));
        } catch {
            throw new Error('SKILLHUB_EMPTY_MAPPING');
        }
    }

    if (!value || typeof value !== 'object') throw new Error('SKILLHUB_EMPTY_MAPPING');

    const object = value as Record<string, unknown>;
    if (Array.isArray(object['mappings'])) {
        return { mappings: object['mappings'] as ModelMapping[] };
    }

    for (const key of ['data', 'result', 'output', 'response', 'content']) {
        if (object[key] === undefined) continue;
        try {
            return parseSkillOutput(object[key]);
        } catch (error) {
            if ((error as Error).message !== 'SKILLHUB_EMPTY_MAPPING') throw error;
        }
    }

    throw new Error('SKILLHUB_EMPTY_MAPPING');
};

export class TemplateMappingService {
    async suggest(
        source: Record<string, unknown>,
        request: AdvertisementRequest,
    ): Promise<TemplateMappingResult> {
        const apiKey = process.env['SKILLHUB_API_KEY'];
        if (!apiKey) throw new Error('SKILLHUB_NOT_CONFIGURED');

        const elements = extractDynamicElements(source);
        const candidates = createCandidates(request);
        if (!elements.length) return { model: MODEL, mappings: [] };
        if (!candidates.length) return { model: MODEL, mappings: [] };

        const elementNames = elements.map((element) => element.name);
        const response = await fetch(SKILLHUB_URL, {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(30_000),
            body: JSON.stringify({
                skill_id: SKILLHUB_ID,
                params: {
                    elements: JSON.stringify(elements),
                    candidates: JSON.stringify(candidates),
                },
            }),
        });
        const responseBody = (await response.json()) as unknown;
        if (!response.ok) {
            console.error('[SkillHub] Template mapping request failed', {
                status: response.status,
            });
            throw new Error('SKILLHUB_MAPPING_FAILED');
        }

        const parsed = parseSkillOutput(responseBody);
        const candidatesByPath = new Map(
            candidates.map((candidate) => [candidate.path, candidate]),
        );
        const allowedElements = new Set(elementNames);
        const modelMappings = new Map(
            (parsed.mappings ?? [])
                .filter((mapping) => mapping.sourcePath)
                .map((mapping) => [mapping.elementName, mapping]),
        );
        const mappings: TemplateMappingSuggestion[] = [];

        for (const element of elements) {
            if (element.lockedLabel) continue;
            const enforcedPath = explicitSourcePath(element);
            const mapping = modelMappings.get(element.name);
            const sourcePath = enforcedPath ?? mapping?.sourcePath ?? null;
            const candidate = sourcePath ? candidatesByPath.get(sourcePath) : undefined;
            if (!candidate || !allowedElements.has(element.name)) continue;
            const isMediaElement = ['image', 'video'].includes(element.type.toLowerCase());
            const isAssetCandidate = candidate.path.startsWith('assets[');
            if (isMediaElement !== isAssetCandidate) continue;
            const assetMatch = candidate.label.match(/\(([^)]+)\)$/);
            if (element.type.toLowerCase() === 'image' && assetMatch?.[1]?.startsWith('video/')) {
                continue;
            }
            if (element.type.toLowerCase() === 'video' && !assetMatch?.[1]?.startsWith('video/')) {
                continue;
            }
            const layout = isMediaElement
                ? {
                      value: candidate.value,
                      fontSize: null,
                      lineHeight: null,
                      reason: `Mapped ${candidate.label} to this ${element.type} slot.`,
                  }
                : safeLayout(element, candidate, mapping);
            mappings.push({
                elementName: element.name,
                sourcePath: candidate.path,
                value: layout.value,
                confidence: enforcedPath
                    ? 0.99
                    : Math.min(1, Math.max(0, Number(mapping?.confidence) || 0)),
                reason: enforcedPath
                    ? `Matched the template's explicit ${candidate.label.toLowerCase()} value slot.`
                    : text(mapping?.reason, 240) || 'Matched by template and field meaning.',
                layout: {
                    fontSize: layout.fontSize,
                    lineHeight: layout.lineHeight,
                    reason: layout.reason,
                },
            });
        }

        return { model: MODEL, mappings };
    }
}

export const templateMappingService = new TemplateMappingService();
