import { Component, computed, inject, signal } from '@angular/core';
import { AdvertisementRequestService, CreatomateTemplate, RealCreatomateService } from '@core/services';
import { CreatomateTemplateThumbnailComponent } from '@features/advertisements';

type EditorTab = 'properties' | 'playground' | 'script';

interface EditableLayer {
    id: string;
    name: string;
    type: string;
    path: Array<string | number>;
}

@Component({
    selector: 'app-revision-workspace',
    standalone: true,
    imports: [CreatomateTemplateThumbnailComponent],
    templateUrl: './revision-workspace.component.html',
    styleUrl: './revision-workspace.component.scss',
})
export class RevisionWorkspaceComponent {
    private readonly creatomate = inject(RealCreatomateService);
    private readonly requestService = inject(AdvertisementRequestService);
    readonly tab = signal<EditorTab>('properties');
    readonly templates = signal<CreatomateTemplate[]>([]);
    readonly selectedTemplateId = signal('');
    readonly source = signal<Record<string, unknown> | null>(null);
    readonly loading = signal(true);
    readonly error = signal('');
    readonly prompt = signal('');
    readonly aiBusy = signal(false);
    readonly aiSummary = signal('');
    readonly aiError = signal('');
    readonly copied = signal(false);
    readonly selectedLayerId = signal('');
    readonly chooserPreviewId = signal('');
    readonly selectedTemplate = computed(() =>
        this.templates().find((template) => template.id === this.selectedTemplateId()),
    );
    readonly layers = computed(() => this.findLayers(this.source()));
    readonly selectedLayer = computed(() =>
        this.layers().find((layer) => layer.id === this.selectedLayerId()) ?? this.layers()[0],
    );
    readonly renderScript = computed(() => JSON.stringify(this.source() ?? {}, null, 2));
    readonly previewRequest = computed(() => this.requestService.requests()[0]);
    readonly previewModifications = computed(() => {
        const layer = this.selectedLayer();
        if (!layer) return {};
        const modifications: Record<string, string> = {};
        const textOrSource = this.value(layer, layer.type === 'text' ? 'text' : 'source');
        if (textOrSource) modifications[layer.name] = textOrSource;
        for (const property of ['font_size', 'font_family', 'x', 'y', 'width', 'height']) {
            const value = this.value(layer, property);
            if (value) modifications[`${layer.name}.${property}`] = value;
        }
        return modifications;
    });

    constructor() {
        void this.loadTemplates();
    }

    async chooseTemplate(templateId: string): Promise<void> {
        this.selectedTemplateId.set(templateId);
        this.selectedLayerId.set('');
        this.source.set(null);
        this.error.set('');
        this.aiSummary.set('');
        if (!templateId) return;
        this.loading.set(true);
        try {
            const detail = await this.creatomate.getTemplate(templateId);
            this.source.set(structuredClone(detail.source));
        } catch (error) {
            this.error.set(this.creatomate.errorMessage(error));
        } finally {
            this.loading.set(false);
        }
    }

    updateLayer(path: Array<string | number>, property: string, value: string): void {
        const next = structuredClone(this.source() ?? {});
        const layer = this.valueAtPath(next, path);
        if (!layer || typeof layer !== 'object') return;
        (layer as Record<string, unknown>)[property] = this.asValue(value);
        this.source.set(next);
    }

    isSelectedLayer(layer: EditableLayer): boolean {
        return this.selectedLayer()?.id === layer.id;
    }

    value(layer: EditableLayer | undefined, property: string): string {
        if (!layer) return '';
        const target = this.valueAtPath(this.source(), layer.path) as Record<string, unknown> | undefined;
        const value = target?.[property];
        return value === undefined || value === null ? '' : String(value);
    }

    async applyPrompt(): Promise<void> {
        const source = this.source();
        if (!source || !this.prompt().trim() || this.aiBusy()) return;
        this.aiBusy.set(true);
        this.aiError.set('');
        try {
            const layer = this.selectedLayer();
            const result = await this.creatomate.editTemplateSource(source, this.prompt().trim(), {
                selectedElement: layer
                    ? { id: layer.id, name: layer.name, type: layer.type }
                    : undefined,
            });
            this.source.set(result.source);
            this.aiSummary.set(result.summary || 'AI updated the RenderScript.');
            this.prompt.set('');
            this.tab.set('properties');
        } catch (error) {
            this.aiError.set(this.creatomate.errorMessage(error));
        } finally {
            this.aiBusy.set(false);
        }
    }

    async copyRenderScript(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.renderScript());
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 1500);
        } catch {
            this.copied.set(false);
        }
    }

    private async loadTemplates(): Promise<void> {
        try {
            this.templates.set(await this.creatomate.listTemplates());
        } catch (error) {
            this.error.set(this.creatomate.errorMessage(error));
        } finally {
            this.loading.set(false);
        }
    }

    private findLayers(source: Record<string, unknown> | null): EditableLayer[] {
        const layers: EditableLayer[] = [];
        const walk = (value: unknown, path: Array<string | number>): void => {
            if (Array.isArray(value)) return value.forEach((item, index) => walk(item, [...path, index]));
            if (!value || typeof value !== 'object') return;
            const record = value as Record<string, unknown>;
            if (typeof record['type'] === 'string' && typeof record['name'] === 'string') {
                layers.push({
                    id: String(record['id'] ?? path.join('.')),
                    name: record['name'], type: record['type'], path,
                });
            }
            Object.entries(record).forEach(([key, child]) => walk(child, [...path, key]));
        };
        if (source) walk(source, []);
        return layers;
    }

    private valueAtPath(value: unknown, path: Array<string | number>): unknown {
        return path.reduce<unknown>((current, part) =>
            current && typeof current === 'object' ? (current as Record<string | number, unknown>)[part] : undefined,
        value);
    }

    private asValue(value: string): string | number {
        const trimmed = value.trim();
        return trimmed !== '' && /^-?\d+(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : value;
    }
}
