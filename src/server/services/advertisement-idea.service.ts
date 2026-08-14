const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_CONTEXT_CHARS = 8_000;

export interface AdvertisementIdeaResult {
    conceptTitle: string;
    hook: string;
    footageDirection: string;
    graphicsDirection: string;
    typographyDirection: string;
    editDirection: string;
    scenes: Array<{
        purpose: string;
        duration: number;
        footage: string;
        overlays: string;
        typography: string;
        prompt: string;
    }>;
}

const SYSTEM_PROMPT = `You are a senior commercial creative director for real-world local business ads.
Create practical production direction for short graphics-driven advertisements made from real video footage with designed overlays and typography.
Do not write a screenplay. Do not suggest a fully AI-generated cinematic film.
Prioritize footage that a small production team can capture, clear on-screen messaging, readable typography, logo-safe space, and a strong CTA.
Return ONLY valid JSON with this shape:
{"conceptTitle":"","hook":"","footageDirection":"","graphicsDirection":"","typographyDirection":"","editDirection":"","scenes":[{"purpose":"hook|message|offer|proof|cta|transition","duration":5,"headline":"","supportingText":"","footage":"","overlays":"","typography":"","prompt":""}]}
Keep the concept concise. Make every scene prompt describe real footage, camera/action, graphic overlays, and typography treatment. Never render readable text inside generated imagery; reserve text for the edit/composition layer.`;

export class AdvertisementIdeaService {
    async generate(context: string): Promise<AdvertisementIdeaResult> {
        const apiKey = process.env['OPENAI_API_KEY'];
        if (!apiKey) throw new Error('OPENAI_NOT_CONFIGURED');
        const cleanContext = context.trim().slice(0, MAX_CONTEXT_CHARS);
        if (!cleanContext) throw new Error('OPENAI_EMPTY_CONTEXT');
        const model = process.env['OPENAI_IDEA_MODEL'] || process.env['OPENAI_MODEL'] || 'gpt-4.1';
        const response = await fetch(OPENAI_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(45_000),
            body: JSON.stringify({
                model,
                response_format: { type: 'json_object' },
                temperature: 0.7,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: cleanContext },
                ],
            }),
        });
        if (!response.ok) {
            console.error('[OpenAI] Advertisement idea request failed', { status: response.status });
            throw new Error('OPENAI_IDEA_FAILED');
        }
        const body = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
        };
        const content = body.choices?.[0]?.message?.content;
        if (!content) throw new Error('OPENAI_EMPTY_RESPONSE');
        let parsed: unknown;
        try {
            parsed = JSON.parse(content);
        } catch {
            throw new Error('OPENAI_INVALID_IDEA');
        }
        return this.validate(parsed);
    }

    private validate(value: unknown): AdvertisementIdeaResult {
        if (!value || typeof value !== 'object') throw new Error('OPENAI_INVALID_IDEA');
        const result = value as Record<string, unknown>;
        const text = (key: string): string =>
            typeof result[key] === 'string' ? String(result[key]).slice(0, 1_000) : '';
        const scenes = Array.isArray(result['scenes'])
            ? result['scenes'].slice(0, 8).map((item) => {
                  const scene = item as Record<string, unknown>;
                  return {
                      purpose: typeof scene['purpose'] === 'string' ? scene['purpose'].slice(0, 30) : 'message',
                      duration: Math.max(1, Math.min(60, Number(scene['duration']) || 5)),
                      headline: typeof scene['headline'] === 'string' ? scene['headline'].slice(0, 60) : '',
                      supportingText: typeof scene['supportingText'] === 'string' ? scene['supportingText'].slice(0, 120) : '',
                      footage: typeof scene['footage'] === 'string' ? scene['footage'].slice(0, 600) : '',
                      overlays: typeof scene['overlays'] === 'string' ? scene['overlays'].slice(0, 600) : '',
                      typography: typeof scene['typography'] === 'string' ? scene['typography'].slice(0, 600) : '',
                      prompt: typeof scene['prompt'] === 'string' ? scene['prompt'].slice(0, 1_000) : '',
                  };
              })
            : [];
        if (!scenes.length) throw new Error('OPENAI_INVALID_IDEA');
        return {
            conceptTitle: text('conceptTitle'),
            hook: text('hook'),
            footageDirection: text('footageDirection'),
            graphicsDirection: text('graphicsDirection'),
            typographyDirection: text('typographyDirection'),
            editDirection: text('editDirection'),
            scenes,
        };
    }
}

export const advertisementIdeaService = new AdvertisementIdeaService();
