import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdvertisementAsset, MockCreatomateRenderJob, MockRenderOutput } from '@core/models';
import {
    AdvertisementRequestService,
    CreatomatePayloadService,
    CreatomateRender,
    CreatomateTemplate,
    MockCreatomateService,
    RealCreatomateService,
    TemplateMappingSuggestion,
} from '@core/services';
import { StatusBadgeComponent } from '@shared/components';
import { AiMappingProgressComponent } from './ai-mapping-progress.component';
import { CreatomateTemplatePreviewComponent } from './creatomate-template-preview.component';
import { CreatomateTemplateThumbnailComponent } from './creatomate-template-thumbnail.component';

const JSON_TOKEN =
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

const escapeHtml = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const highlightJson = (json: string): string =>
    escapeHtml(json).replace(JSON_TOKEN, (match) => {
        const className = /^"/.test(match)
            ? /:$/.test(match)
                ? 'json-key'
                : 'json-string'
            : /true|false/.test(match)
              ? 'json-boolean'
              : /null/.test(match)
                ? 'json-null'
                : 'json-number';
        return `<span class="${className}">${match}</span>`;
    });

@Component({
    selector: 'app-advertisement-detail',
    standalone: true,
    imports: [
        AiMappingProgressComponent,
        CreatomateTemplatePreviewComponent,
        CreatomateTemplateThumbnailComponent,
        DatePipe,
        RouterLink,
        StatusBadgeComponent,
        UpperCasePipe,
    ],
    templateUrl: './advertisement-detail.component.html',
    styleUrl: './advertisement-detail.component.scss',
})
export class AdvertisementDetailComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly service = inject(AdvertisementRequestService);
    private readonly payloadService = inject(CreatomatePayloadService);
    private readonly mockCreatomate = inject(MockCreatomateService);
    private readonly realCreatomate = inject(RealCreatomateService);
    private readonly sanitizer = inject(DomSanitizer);
    readonly request = computed(() =>
        this.service.getById(this.route.snapshot.paramMap.get('id') ?? ''),
    );
    readonly payload = computed(() => {
        const request = this.request();
        return request ? this.payloadService.createPreview(request) : null;
    });
    readonly payloadJson = computed(() => JSON.stringify(this.payload() ?? {}, null, 2));
    readonly payloadHtml = computed<SafeHtml>(() =>
        this.sanitizer.bypassSecurityTrustHtml(highlightJson(this.payloadJson())),
    );
    readonly payloadCopied = signal(false);
    readonly jobs = computed(() =>
        this.mockCreatomate.jobsFor(this.route.snapshot.paramMap.get('id') ?? ''),
    );
    readonly rendering = computed(() =>
        this.jobs().some((job) => job.status === 'queued' || job.status === 'rendering'),
    );
    readonly previewJob = signal<MockCreatomateRenderJob | null>(null);
    readonly realRender = signal<CreatomateRender | null>(null);
    readonly realOutput = signal<MockRenderOutput | null>(null);
    readonly realBusy = signal(false);
    readonly realError = signal('');
    readonly templates = signal<CreatomateTemplate[]>([]);
    readonly templatesLoading = signal(true);
    readonly templatesError = signal('');
    readonly selectedTemplateId = signal<string | null>(null);
    readonly templateGalleryOpen = signal(false);
    readonly sheetImportMessage = signal('');
    readonly assetPromptOpen = signal(false);
    readonly assetUploading = signal(false);
    readonly assetUploadMessage = signal('');
    private readonly pendingImport = signal<{
        importVersion: number;
        sourceLabel: string;
    } | null>(null);
    readonly previewTemplate = signal<CreatomateTemplate | null>(null);
    readonly templateModifications = signal<Record<string, string>>({});
    readonly templateValuesById = signal<Partial<Record<string, Record<string, string>>>>({});
    readonly templateSourceById = signal<Partial<Record<string, Record<string, unknown>>>>({});
    readonly templateEditedSourceById = signal<Partial<Record<string, Record<string, unknown>>>>(
        {},
    );
    readonly templateSourceLoading = signal(false);
    readonly templateSourceError = signal('');
    readonly templateSourceExpanded = signal(false);
    readonly templateMappingBusy = signal(false);
    readonly templateMappingError = signal('');
    readonly templateMappingSuggestions = signal<TemplateMappingSuggestion[]>([]);
    readonly templateMappingApplied = signal(false);
    private readonly preAiSuggestionValues = signal<Record<string, string> | null>(null);
    private readonly importMappingVersion = signal(0);
    private readonly templateMappingVersionById = signal<Partial<Record<string, number>>>({});
    private readonly lastImportSourceLabel = signal('Data');
    readonly selectedTemplate = computed(() =>
        this.templates().find((template) => template.id === this.selectedTemplateId()),
    );
    readonly selectedTemplateValues = computed(() => {
        const templateId = this.selectedTemplateId();
        return templateId ? this.templateValuesById()[templateId] : undefined;
    });
    readonly selectedTemplateValueEntries = computed(() =>
        Object.entries(this.selectedTemplateValues() ?? {}),
    );
    readonly selectedTemplateSource = computed(() => {
        const templateId = this.selectedTemplateId();
        return templateId ? this.templateSourceById()[templateId] : undefined;
    });
    readonly selectedTemplateSourceJson = computed(() =>
        JSON.stringify(this.selectedTemplateSource() ?? {}, null, 2),
    );
    readonly selectedTemplateEditedSource = computed(() => {
        const templateId = this.selectedTemplateId();
        return templateId ? this.templateEditedSourceById()[templateId] : undefined;
    });

    constructor() {
        this.initializeImportedAssetPrompt();
        void this.loadTemplates();
    }

    private initializeImportedAssetPrompt(): void {
        const imported = this.route.snapshot.queryParamMap.get('imported');
        if (!['sheet', 'file'].includes(imported ?? '')) return;
        const sourceLabel = imported === 'sheet' ? 'Sheet' : 'File';
        const importVersion = 1;
        this.importMappingVersion.set(importVersion);
        this.templateMappingVersionById.set({});
        this.lastImportSourceLabel.set(sourceLabel);
        this.pendingImport.set({ importVersion, sourceLabel });
        this.assetPromptOpen.set(true);
        this.sheetImportMessage.set(`${sourceLabel} imported. Add its creative assets next.`);
    }

    startDemoRender(): void {
        const request = this.request();
        if (request && !this.rendering()) this.mockCreatomate.start(request);
    }

    async startRealRender(): Promise<void> {
        const request = this.request();
        if (!request || this.realBusy() || this.templateMappingBusy()) return;
        const output: MockRenderOutput = request.outsideAd.enabled
            ? 'outside'
            : request.insideAd.enabled
              ? 'inside'
              : 'vertical';
        this.realBusy.set(true);
        this.realError.set('');
        this.realOutput.set(output);
        try {
            const templateId = this.selectedTemplateId() ?? undefined;
            let modifications = this.templateModifications();
            if (templateId) {
                let source = this.templateSourceById()[templateId];
                if (!source) {
                    const detail = await this.realCreatomate.getTemplate(templateId);
                    source = detail.source;
                    this.templateSourceById.update((sources) => ({
                        ...sources,
                        [templateId]: detail.source,
                    }));
                }
                if (!Object.keys(modifications).length) {
                    modifications = this.realCreatomate.mapTemplateModifications(
                        source,
                        request,
                        this.templateValuesById()[templateId] ?? {},
                    );
                    this.templateValuesById.update((values) => ({
                        ...values,
                        [templateId]: modifications,
                    }));
                    this.templateModifications.set(modifications);
                }
            }
            const editedSource = templateId
                ? this.templateEditedSourceById()[templateId]
                : undefined;
            let render = await this.realCreatomate.create(
                request,
                output,
                templateId,
                modifications,
                editedSource,
            );
            this.realRender.set(render);
            this.service.updateStatus(
                request.id,
                render.status === 'rendering' ? 'rendering' : 'queued',
            );
            for (
                let attempt = 0;
                attempt < 80 && !['succeeded', 'failed'].includes(render.status);
                attempt += 1
            ) {
                await new Promise((resolve) => setTimeout(resolve, 2500));
                render = await this.realCreatomate.get(render.id);
                this.realRender.set(render);
                this.service.updateStatus(
                    request.id,
                    render.status === 'rendering' ? 'rendering' : 'queued',
                );
            }
            if (render.status === 'succeeded') this.service.updateStatus(request.id, 'completed');
            if (render.status === 'failed') {
                this.service.updateStatus(request.id, 'failed');
                this.realError.set(
                    render.error_message || 'Creatomate could not render this output.',
                );
            }
        } catch (error) {
            this.realError.set(this.realCreatomate.errorMessage(error));
        } finally {
            this.realBusy.set(false);
        }
    }

    selectTemplate(templateId: string): void {
        this.selectedTemplateId.set(this.selectedTemplateId() === templateId ? null : templateId);
    }

    toggleTemplateSource(): void {
        this.templateSourceExpanded.update((expanded) => !expanded);
    }

    async copyPayload(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.payloadJson());
            this.payloadCopied.set(true);
            setTimeout(() => this.payloadCopied.set(false), 1500);
        } catch {
            // Clipboard access can be denied by the browser; the JSON is still visible to copy manually.
        }
    }

    async suggestTemplateMappings(applyImmediately = false): Promise<boolean> {
        const templateId = this.selectedTemplateId();
        const request = this.request();
        if (!templateId || !request || this.templateMappingBusy()) return false;
        const loadingStartedAt = Date.now();
        this.templateMappingBusy.set(true);
        this.templateMappingError.set('');
        this.templateMappingApplied.set(false);
        let mapped = false;
        try {
            let source = this.templateSourceById()[templateId];
            if (!source) {
                const detail = await this.realCreatomate.getTemplate(templateId);
                source = detail.source;
                this.templateSourceById.update((sources) => ({
                    ...sources,
                    [templateId]: detail.source,
                }));
            }
            const result = await this.realCreatomate.suggestTemplateMappings(source, request);
            this.templateMappingSuggestions.set(result.mappings);
            if (!result.mappings.length) {
                this.templateMappingError.set(
                    'GPT-5.4 nano did not find any confident matches. You can still use the standard mapper.',
                );
            } else {
                mapped = true;
                if (applyImmediately) this.applyTemplateMappingSuggestions();
            }
        } catch (error) {
            this.templateMappingError.set(this.realCreatomate.errorMessage(error));
        } finally {
            const remainingDisplayTime = 900 - (Date.now() - loadingStartedAt);
            if (remainingDisplayTime > 0) {
                await new Promise((resolve) => setTimeout(resolve, remainingDisplayTime));
            }
            this.templateMappingBusy.set(false);
        }
        return mapped;
    }

    applyTemplateMappingSuggestions(): void {
        const templateId = this.selectedTemplateId();
        const request = this.request();
        const source = this.selectedTemplateSource();
        if (!templateId || !request || !source || !this.templateMappingSuggestions().length) return;
        const suggestedValues = Object.fromEntries(
            this.templateMappingSuggestions().flatMap((suggestion) => {
                const values: Array<[string, string]> = [
                    [suggestion.elementName, suggestion.value.trim().slice(0, 500)],
                ];
                if (suggestion.layout.fontSize) {
                    values.push([
                        `${suggestion.elementName}.font_size`,
                        suggestion.layout.fontSize,
                    ]);
                }
                if (suggestion.layout.lineHeight) {
                    values.push([
                        `${suggestion.elementName}.line_height`,
                        suggestion.layout.lineHeight,
                    ]);
                }
                return values;
            }),
        );
        const modifications = this.realCreatomate.mapTemplateModifications(source, request, {
            ...(this.templateValuesById()[templateId] ?? {}),
            ...suggestedValues,
        });
        this.templateValuesById.update((values) => ({
            ...values,
            [templateId]: modifications,
        }));
        this.templateModifications.set(modifications);
        this.templateMappingApplied.set(true);
    }

    discardTemplateMappingSuggestions(): void {
        this.templateMappingSuggestions.set([]);
        this.templateMappingError.set('');
        this.templateMappingApplied.set(false);
    }

    aiSuggestionsAvailable(): boolean {
        return this.importMappingVersion() > 0 && !this.templateMappingBusy();
    }

    aiSuggestionsInjected(templateId: string): boolean {
        const importVersion = this.importMappingVersion();
        return importVersion > 0 && this.templateMappingVersionById()[templateId] === importVersion;
    }

    openTemplatePreview(template: CreatomateTemplate): void {
        if (this.templateMappingBusy()) return;
        if (this.selectedTemplateId() !== template.id) {
            this.discardTemplateMappingSuggestions();
            this.preAiSuggestionValues.set(null);
        }
        this.selectedTemplateId.set(template.id);
        this.templateModifications.set(this.templateValuesById()[template.id] ?? {});
        void this.loadTemplateSource(template.id);
        this.previewTemplate.set(template);
        this.templateGalleryOpen.set(false);
    }

    async injectAiSuggestions(template: CreatomateTemplate): Promise<void> {
        const importVersion = this.importMappingVersion();
        if (importVersion === 0 || this.templateMappingBusy()) return;
        this.preAiSuggestionValues.set(this.templateValuesById()[template.id] ?? {});
        const mapped = await this.suggestTemplateMappings(true);
        if (!mapped) return;
        this.templateMappingVersionById.update((versions) => ({
            ...versions,
            [template.id]: importVersion,
        }));

        this.sheetImportMessage.set(
            `${this.lastImportSourceLabel()} mapped by GPT-5.4 nano. Review the populated preview.`,
        );
    }

    revertAiSuggestions(template: CreatomateTemplate): void {
        const snapshot = this.preAiSuggestionValues();
        if (!snapshot || this.templateMappingBusy()) return;
        this.templateValuesById.update((values) => ({
            ...values,
            [template.id]: snapshot,
        }));
        this.templateModifications.set(snapshot);
        this.templateMappingVersionById.update((versions) => {
            const { [template.id]: _removed, ...rest } = versions;
            return rest;
        });
        this.preAiSuggestionValues.set(null);
        this.discardTemplateMappingSuggestions();
        this.sheetImportMessage.set('Reverted to the values from before AI mapping.');
    }

    applyTemplateValues(modifications: Record<string, string>): void {
        const templateId = this.previewTemplate()?.id;
        if (templateId)
            this.templateValuesById.update((values) => ({
                ...values,
                [templateId]: modifications,
            }));
        this.templateModifications.set(modifications);
        this.previewTemplate.set(null);
    }

    applyEditedSource(source: Record<string, unknown>): void {
        const templateId = this.previewTemplate()?.id;
        if (!templateId) return;
        this.templateEditedSourceById.update((sources) => ({
            ...sources,
            [templateId]: source,
        }));
    }

    async uploadImportedAssets(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        input.value = '';
        const request = this.request();
        if (!request || !files.length || this.assetUploading()) return;
        this.assetUploading.set(true);
        this.assetUploadMessage.set('');
        try {
            for (const file of files) {
                const resolvedCategory = file.type.startsWith('video/')
                    ? 'backgroundVideo'
                    : 'backgroundImage';
                await this.service.uploadAsset(request.id, file, resolvedCategory);
            }
            this.assetUploadMessage.set(
                `${files.length} asset${files.length === 1 ? '' : 's'} uploaded to Supabase.`,
            );
        } catch (error) {
            const description = (error as { error?: { errorDescription?: string } }).error
                ?.errorDescription;
            this.assetUploadMessage.set(
                description || (error as Error).message || 'The asset could not be uploaded.',
            );
        } finally {
            this.assetUploading.set(false);
        }
    }

    assetPreviewable(asset: AdvertisementAsset): boolean {
        return asset.type.startsWith('image/') && Boolean(asset.previewUrl);
    }

    async removeImportedAsset(asset: AdvertisementAsset): Promise<void> {
        const request = this.request();
        if (!request || this.assetUploading()) return;
        this.assetUploading.set(true);
        this.assetUploadMessage.set('');
        try {
            await this.service.removeAsset(request.id, asset.id);
            this.assetUploadMessage.set(`${asset.name} removed.`);
        } catch (error) {
            const description = (error as { error?: { errorDescription?: string } }).error
                ?.errorDescription;
            this.assetUploadMessage.set(
                description || (error as Error).message || 'The asset could not be removed.',
            );
        } finally {
            this.assetUploading.set(false);
        }
    }

    async continueAfterAssetUpload(): Promise<void> {
        const pending = this.pendingImport();
        if (!pending || this.assetUploading()) return;
        this.assetPromptOpen.set(false);
        this.pendingImport.set(null);
        await this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { imported: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
        this.sheetImportMessage.set(
            `${pending.sourceLabel} imported with assets. Select a template, then inject AI suggestions from its preview.`,
        );
    }

    private async loadTemplates(): Promise<void> {
        this.templatesLoading.set(true);
        this.templatesError.set('');
        try {
            const templates = await this.realCreatomate.listTemplates();
            this.templates.set(templates);
        } catch (error) {
            this.templatesError.set(this.realCreatomate.errorMessage(error));
        } finally {
            this.templatesLoading.set(false);
        }
    }

    private async loadTemplateSource(templateId: string): Promise<void> {
        if (this.templateSourceById()[templateId]) return;
        this.templateSourceLoading.set(true);
        this.templateSourceError.set('');
        try {
            const detail = await this.realCreatomate.getTemplate(templateId);
            this.templateSourceById.update((sources) => ({
                ...sources,
                [templateId]: detail.source,
            }));
        } catch (error) {
            this.templateSourceError.set(this.realCreatomate.errorMessage(error));
        } finally {
            this.templateSourceLoading.set(false);
        }
    }
}
