const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const MAX_PROMPT_CHARS = 4_000;

export interface StoryboardImageResult {
    model: string;
    dataUrl: string;
}

export class StoryboardImageService {
    async generate(prompt: string, output: 'outside' | 'inside' | 'vertical'): Promise<StoryboardImageResult> {
        const apiKey = process.env['OPENAI_API_KEY'];
        if (!apiKey) throw new Error('OPENAI_NOT_CONFIGURED');
        const cleanPrompt = prompt.trim().slice(0, MAX_PROMPT_CHARS);
        if (!cleanPrompt) throw new Error('OPENAI_EMPTY_PROMPT');

        const model = process.env['OPENAI_IMAGE_MODEL'] || 'gpt-image-1';
        const size = output === 'vertical' ? '1024x1536' : '1536x1024';
        const response = await fetch(OPENAI_IMAGES_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(90_000),
            body: JSON.stringify({ model, prompt: cleanPrompt, size, quality: 'low', n: 1 }),
        });

        if (!response.ok) {
            console.error('[OpenAI] Storyboard image request failed', { status: response.status });
            throw new Error('OPENAI_IMAGE_FAILED');
        }

        const body = (await response.json()) as {
            data?: Array<{ b64_json?: string; url?: string }>;
        };
        const image = body.data?.[0];
        if (image?.b64_json) return { model, dataUrl: `data:image/png;base64,${image.b64_json}` };
        if (image?.url) return { model, dataUrl: image.url };
        throw new Error('OPENAI_IMAGE_EMPTY');
    }
}

export const storyboardImageService = new StoryboardImageService();
