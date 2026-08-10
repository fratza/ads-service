const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_SOURCE_CHARS = 60_000;
const MAX_PROMPT_CHARS = 2_000;

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

const SYSTEM_PROMPT = `You are an expert editor of Creatomate JSON video/image templates (see https://creatomate.com/docs/json/introduction).
You will be given the current template's JSON "source" object and a plain-language instruction describing a change to make.
Apply ONLY the requested change and return the complete, updated JSON source - do not omit or rewrite unrelated elements or properties.

Rules:
- Preserve every element's "id" and "name" unless the instruction explicitly asks to rename or remove it.
- To add or change an animation on an element, add/edit an "animations" array on that element. Each animation object may include: "type" (e.g. "fade", "slide", "wipe", "scale", "spin", "text-reveal"), "time" (seconds, or "start"/"end"), "duration", "easing" (e.g. "linear", "ease-out", "ease-in-out", "cubic-bezier"), "fade" (boolean), "scope" ("element" or "composition"), "direction", "split" (for text animations, e.g. "letter", "word", "line").
- Keep values formatted the same way the original template used them (e.g. percentages like "50%", durations like "1 s").
- Never invent new top-level template keys; keep "width", "height", "duration", "output_format", "elements", etc. as in the original unless the instruction asks to change them.
- Respond with ONLY a JSON object of the shape {"source": <the full updated template JSON>, "summary": "<one sentence describing what changed>", "changes": ["<short user-friendly description of each change>"]}. No markdown, no code fences, no extra commentary.`;

export class TemplateJsonEditorService {
    async edit(
        source: Record<string, unknown>,
        prompt: string,
        context?: TemplateJsonEditContext,
    ): Promise<TemplateJsonEditResult> {
        const apiKey = process.env['OPENAI_API_KEY'];
        if (!apiKey) throw new Error('OPENAI_NOT_CONFIGURED');

        const cleanPrompt = prompt.trim().slice(0, MAX_PROMPT_CHARS);
        if (!cleanPrompt) throw new Error('OPENAI_EMPTY_PROMPT');

        const sourceJson = JSON.stringify(source);
        if (sourceJson.length > MAX_SOURCE_CHARS) throw new Error('TEMPLATE_TOO_LARGE');

        const model = process.env['OPENAI_MODEL'] || 'gpt-4.1';
        const selectedElement = this.selectedElementContext(context);
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
                temperature: 0.2,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: `Current template JSON:\n${sourceJson}${selectedElement}\n\nInstruction: ${cleanPrompt}`,
                    },
                ],
            }),
        });

        if (!response.ok) {
            console.error('[OpenAI] Template JSON edit request failed', {
                status: response.status,
            });
            throw new Error('OPENAI_EDIT_FAILED');
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
            throw new Error('OPENAI_INVALID_JSON');
        }

        const result = parsed as { source?: unknown; summary?: unknown; changes?: unknown };
        if (!result.source || typeof result.source !== 'object' || Array.isArray(result.source)) {
            throw new Error('OPENAI_INVALID_JSON');
        }

        return {
            model,
            source: result.source as Record<string, unknown>,
            summary: typeof result.summary === 'string' ? result.summary.slice(0, 300) : '',
            changes: Array.isArray(result.changes)
                ? result.changes
                      .filter((change): change is string => typeof change === 'string')
                      .slice(0, 6)
                      .map((change) => change.slice(0, 180))
                : [],
        };
    }

    private selectedElementContext(context?: TemplateJsonEditContext): string {
        const selected = context?.selectedElement;
        if (
            !selected ||
            typeof selected.id !== 'string' ||
            typeof selected.name !== 'string' ||
            typeof selected.type !== 'string'
        ) {
            return '';
        }
        const safeSelectedElement = {
            id: selected.id.slice(0, 200),
            name: selected.name.slice(0, 200),
            type: selected.type.slice(0, 80),
        };
        return `\n\nSelected video layer: ${JSON.stringify(safeSelectedElement)}. Treat this as the target for pronouns such as "it" or "this layer". Do not change a different element unless the instruction explicitly says to.`;
    }
}

export const templateJsonEditorService = new TemplateJsonEditorService();
