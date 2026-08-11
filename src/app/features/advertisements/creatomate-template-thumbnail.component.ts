import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, input, signal } from '@angular/core';
import { AdvertisementRequest } from '@core/models';
import { CreatomateTemplate, RealCreatomateService } from '@core/services';
import { Preview } from '@creatomate/preview';

@Component({
    selector: 'app-creatomate-template-thumbnail',
    standalone: true,
    host: { '[class.interactive]': 'interactive()' },
    template: `
        <div #container class="thumbnail-player"></div>
        @if (loading()) {<div class="thumbnail-loading"><i></i></div>}
        @if (error()) {<div class="thumbnail-fallback"><span>{{ template().name.slice(0, 2).toUpperCase() }}</span></div>}
        <div class="mobile-fallback"><span>{{ template().name.slice(0, 2).toUpperCase() }}</span></div>
    `,
    styles: [`
        :host{position:absolute;inset:0;display:block;overflow:hidden;background:linear-gradient(140deg,#0a1735,#3157a8 62%,#8dcb2c);pointer-events:none}.thumbnail-player{width:100%;height:100%;pointer-events:none}:host(.interactive){pointer-events:auto}:host(.interactive) .thumbnail-player{pointer-events:auto}.thumbnail-loading,.thumbnail-fallback,.mobile-fallback{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(140deg,#0a1735,#3157a8 62%,#8dcb2c);color:#fff}.thumbnail-loading i{width:20px;height:20px;border:3px solid rgba(255,255,255,.28);border-top-color:#9bd538;border-radius:50%;animation:spin .8s linear infinite}.thumbnail-fallback span,.mobile-fallback span{font-size:24px;font-weight:900}.mobile-fallback{display:none}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:700px){.thumbnail-player{display:none}.thumbnail-loading{display:none}.thumbnail-fallback,.mobile-fallback{display:grid}}
    `],
})
export class CreatomateTemplateThumbnailComponent implements AfterViewInit, OnDestroy {
    private readonly service = inject(RealCreatomateService);
    private preview?: Preview;
    @ViewChild('container', { static: true }) private readonly container!: ElementRef<HTMLDivElement>;
    readonly template = input.required<CreatomateTemplate>();
    readonly request = input.required<AdvertisementRequest>();
    readonly modifications = input<Record<string, string>>({});
    readonly templateSource = input<Record<string, unknown> | null>(null);
    readonly interactive = input(false);
    readonly loading = signal(true);
    readonly error = signal(false);
    private readonly templateLoaded = signal(false);

    constructor() {
        effect(() => {
            const modifications = this.modifications();
            const source = this.templateSource();
            if (!this.preview || !this.templateLoaded()) return;
            if (source) {
                void this.updateSource(source);
            } else if (Object.keys(modifications).length) {
                void this.updatePreview(modifications);
            }
        });
    }

    async ngAfterViewInit(): Promise<void> {
        if (typeof matchMedia === 'function' && matchMedia('(max-width: 700px)').matches) {
            this.error.set(true);
            this.loading.set(false);
            return;
        }
        try {
            const { playerToken } = await this.service.getPreviewConfig();
            this.preview = new Preview(this.container.nativeElement, 'player', playerToken);
            this.preview.onReady = () => { void this.load(); };
        } catch {
            this.error.set(true);
            this.loading.set(false);
        }
    }

    ngOnDestroy(): void { this.preview?.dispose(); }

    private async load(): Promise<void> {
        if (!this.preview) return;
        try {
            await this.preview.loadTemplate(this.template().id);
            this.templateLoaded.set(true);
            const source = this.templateSource();
            if (source) {
                await this.updateSource(source);
                return;
            }
            const request = this.request();
            const message = request.outsideAd.messages[0] ?? request.insideAd.messages[0];
            const defaults = {
                'Business-Name': request.businessName,
                'Main-Headline': message?.headline ?? request.verticalAds.variations[0]?.headline ?? 'Your message goes here',
                'Supporting-Text': message?.supportingText ?? request.highlights,
                'Contact': request.contactInformation.website || request.contactInformation.phone,
                'Website': request.contactInformation.website,
            };
            const modifications = this.modifications();
            await this.updatePreview(Object.keys(modifications).length ? modifications : defaults);
            this.loading.set(false);
        } catch {
            this.error.set(true);
            this.loading.set(false);
        }
    }

    private async updateSource(source: Record<string, unknown>): Promise<void> {
        if (!this.preview) return;
        try {
            await this.preview.setSource(source);
            await this.preview.setControls(this.interactive());
            await this.preview.setTime(0);
            this.loading.set(false);
        } catch {
            this.error.set(true);
            this.loading.set(false);
        }
    }

    private async updatePreview(modifications: Record<string, string>): Promise<void> {
        if (!this.preview) return;
        await this.preview.setModifications(modifications);
        await this.preview.setControls(this.interactive());
        await this.preview.setTime(0);
        if (!this.interactive()) await this.preview.pause();
    }
}
