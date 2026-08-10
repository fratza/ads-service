import { isPlatformBrowser, JsonPipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
    AdvertisementAsset,
    AdvertisementMessage,
    AdvertisementRequestInput,
    AssetCategory,
    ContactOption,
    VerticalAdVariation,
} from '@core/models';
import {
    AdvertisementInputService,
    AdvertisementRequestService,
    CreatomatePayloadService,
    StorageService,
} from '@core/services';
import { debounceTime } from 'rxjs';

type MessageGroup = FormGroup<{
    id: FormControl<string>;
    slideNumber: FormControl<number>;
    headline: FormControl<string>;
    supportingText: FormControl<string>;
    displayDuration: FormControl<number>;
    sortOrder: FormControl<number>;
}>;
type VariationGroup = FormGroup<{
    id: FormControl<string>;
    variationNumber: FormControl<number>;
    headline: FormControl<string>;
    message: FormControl<string>;
    supportingText: FormControl<string>;
    aspectRatio: FormControl<'9:16'>;
    sortOrder: FormControl<number>;
}>;

const URL_PATTERN = /^https?:\/\/.+/i;
const DRAFT_KEY = 'ntv-current-advertisement-draft';
const HEADLINE_LIMIT = 60;
const SUPPORTING_LIMIT = 120;

@Component({
    selector: 'app-advertisement-form',
    standalone: true,
    imports: [JsonPipe, NgTemplateOutlet, ReactiveFormsModule],
    templateUrl: './advertisement-form.component.html',
    styleUrl: './advertisement-form.component.scss',
    host: { '[class.client-intake]': 'isClientIntake()' },
})
export class AdvertisementFormComponent {
    private readonly requestService = inject(AdvertisementRequestService);
    private readonly advertisementInput = inject(AdvertisementInputService);
    private readonly storage = inject(StorageService);
    private readonly payloadService = inject(CreatomatePayloadService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly platformId = inject(PLATFORM_ID);
    readonly currentStep = signal(0);
    readonly autosaveState = signal<'saved' | 'saving'>('saved');
    readonly notice = signal('');
    readonly assets = signal<AdvertisementAsset[]>([]);
    readonly reviewConfirmed = signal(false);
    readonly submitting = signal(false);
    readonly importing = signal(false);
    readonly googleSheetUrl = signal('');
    readonly importIssues = signal<string[]>([]);
    private submissionIdempotencyKey = crypto.randomUUID();
    readonly helpText = computed(
        () =>
            [
                'Start with accurate dealer and business details. These identify the request everywhere else.',
                'Choose only the contact details that should be visible in the final creative.',
                'Outside ads benefit from short, bold headlines that drivers can read quickly.',
                'Use inside messaging for offers, upgrades, and calls to action near the point of sale.',
                'Vertical variations use a portrait 9:16 canvas for tall displays.',
                'Selected files are temporary previews. A real upload flow will be added later.',
                'Confirm every section before marking this request ready.',
            ][this.currentStep()],
    );
    readonly headlineLimit = HEADLINE_LIMIT;
    readonly supportingLimit = SUPPORTING_LIMIT;
    readonly steps = [
        { title: 'Dealer & business', short: 'Business' },
        { title: 'Contact information', short: 'Contact' },
        { title: 'Outside ad', short: 'Outside' },
        { title: 'Inside ad', short: 'Inside' },
        { title: 'Vertical ads', short: 'Vertical' },
        { title: 'Assets', short: 'Assets' },
        { title: 'Review', short: 'Review' },
    ];
    readonly contactOptions: { value: ContactOption; label: string }[] = [
        { value: 'website', label: 'Website' },
        { value: 'phone', label: 'Phone' },
        { value: 'address', label: 'Address' },
        { value: 'socialMedia', label: 'Social media' },
    ];
    readonly assetSections: {
        category: AssetCategory;
        title: string;
        description: string;
        multiple: boolean;
        accept: string;
    }[] = [
        {
            category: 'logo',
            title: 'Business logo',
            description: 'Transparent PNG recommended for the cleanest result.',
            multiple: false,
            accept: '.png,.jpg,.jpeg,.webp',
        },
        {
            category: 'backgroundImage',
            title: 'Background images',
            description: 'High-resolution landscape images.',
            multiple: true,
            accept: '.png,.jpg,.jpeg,.webp',
        },
        {
            category: 'productImage',
            title: 'Product images',
            description: 'Menu items, services, or featured products.',
            multiple: true,
            accept: '.png,.jpg,.jpeg,.webp',
        },
        {
            category: 'backgroundVideo',
            title: 'Background videos',
            description: 'Short MP4 or MOV footage.',
            multiple: true,
            accept: '.mp4,.mov',
        },
        {
            category: 'additional',
            title: 'Additional assets',
            description: 'Any other creative references.',
            multiple: true,
            accept: '.png,.jpg,.jpeg,.webp,.mp4,.mov',
        },
    ];

    readonly form = new FormGroup({
        dealer: new FormGroup({
            dealerNumber: new FormControl('', {
                nonNullable: true,
                validators: [Validators.required],
            }),
            dealerEmail: new FormControl('', {
                nonNullable: true,
                validators: [Validators.required, Validators.email],
            }),
            generalAdLength: new FormControl<number | null>(20),
            businessName: new FormControl('', {
                nonNullable: true,
                validators: [Validators.required],
            }),
            hasLogo: new FormControl(true, { nonNullable: true }),
            likesCurrentWebsite: new FormControl<boolean | null>(null),
            highlights: new FormControl('', { nonNullable: true }),
            fileShareLink: new FormControl('', {
                nonNullable: true,
                validators: [Validators.pattern(URL_PATTERN)],
            }),
        }),
        contact: new FormGroup({
            included: new FormControl<ContactOption[]>(['website', 'phone'], { nonNullable: true }),
            website: new FormControl('', {
                nonNullable: true,
                validators: [Validators.pattern(URL_PATTERN)],
            }),
            phone: new FormControl('', { nonNullable: true }),
            address: new FormControl('', { nonNullable: true }),
            socialMedia: new FormControl('', { nonNullable: true }),
            generateQrCode: new FormControl(false, { nonNullable: true }),
        }),
        outside: new FormGroup({
            enabled: new FormControl(true, { nonNullable: true }),
            length: new FormControl<number | null>(15),
            contactOptions: new FormControl<ContactOption[]>(['website', 'phone'], {
                nonNullable: true,
            }),
            messages: new FormArray<MessageGroup>([]),
        }),
        inside: new FormGroup({
            enabled: new FormControl(true, { nonNullable: true }),
            length: new FormControl<number | null>(30),
            contactOptions: new FormControl<ContactOption[]>(['website'], { nonNullable: true }),
            messages: new FormArray<MessageGroup>([]),
        }),
        vertical: new FormGroup({
            enabled: new FormControl(true, { nonNullable: true }),
            quantity: new FormControl(1, { nonNullable: true, validators: [Validators.min(1)] }),
            contactOptions: new FormControl<ContactOption[]>(['website'], { nonNullable: true }),
            variations: new FormArray<VariationGroup>([]),
        }),
    });
    readonly isEdit = computed(() => Boolean(this.route.snapshot.paramMap.get('id')));
    readonly clientToken = this.route.snapshot.paramMap.get('token');
    readonly isClientIntake = computed(() => Boolean(this.clientToken));
    readonly payloadPreview = signal<ReturnType<CreatomatePayloadService['createPreview']> | null>(
        null,
    );

    constructor() {
        this.seedDefaults();
        const id = this.route.snapshot.paramMap.get('id');
        const existing = id ? this.requestService.getById(id) : undefined;
        if (existing) this.loadRequest(existing);
        else {
            const draft = this.storage.get<AdvertisementRequestInput>(this.draftKey);
            if (draft) {
                this.loadRequest(draft);
                this.flash('Saved draft restored');
            }
        }
        this.form.valueChanges
            .pipe(debounceTime(650), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.autosaveState.set('saving');
                this.storage.set(this.draftKey, this.toRequest('draft'));
                this.autosaveState.set('saved');
            });
        this.form.controls.vertical.controls.quantity.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((quantity) => this.syncVariations(quantity));
        this.form.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.refreshPayload());
        this.refreshPayload();
    }

    get outsideMessages(): FormArray<MessageGroup> {
        return this.form.controls.outside.controls.messages;
    }
    get insideMessages(): FormArray<MessageGroup> {
        return this.form.controls.inside.controls.messages;
    }
    get verticalVariations(): FormArray<VariationGroup> {
        return this.form.controls.vertical.controls.variations;
    }
    included(option: ContactOption): boolean {
        return this.form.controls.contact.controls.included.value.includes(option);
    }
    optionSelected(group: 'outside' | 'inside' | 'vertical', option: ContactOption): boolean {
        return this.form.controls[group].controls.contactOptions.value.includes(option);
    }

    toggleContact(
        group: 'contact' | 'outside' | 'inside' | 'vertical',
        option: ContactOption,
        checked: boolean,
    ): void {
        const control =
            group === 'contact'
                ? this.form.controls.contact.controls.included
                : this.form.controls[group].controls.contactOptions;
        const next = checked
            ? [...control.value, option]
            : control.value.filter((value) => value !== option);
        control.setValue([...new Set(next)]);
        if (group === 'contact') this.updateContactValidators();
    }

    next(): void {
        if (!this.validateStep(this.currentStep())) return;
        this.currentStep.update((step) => Math.min(step + 1, this.steps.length - 1));
        if (this.currentStep() === 6) this.refreshPayload();
        this.scrollTop();
    }
    previous(): void {
        this.currentStep.update((step) => Math.max(step - 1, 0));
        this.scrollTop();
    }
    goToStep(step: number): void {
        this.currentStep.set(step);
        this.scrollTop();
    }
    saveDraft(): void {
        this.storage.set(this.draftKey, this.toRequest('draft'));
        this.flash('Draft saved on this device');
    }
    reset(): void {
        if (!confirm('Reset this request and remove the saved draft?')) return;
        this.storage.remove(this.draftKey);
        this.form.reset();
        this.outsideMessages.clear();
        this.insideMessages.clear();
        this.verticalVariations.clear();
        this.assets.set([]);
        this.seedDefaults();
        this.currentStep.set(0);
    }
    async importFile(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;
        this.importing.set(true);
        try {
            const previews = await this.advertisementInput.previewFile(file);
            if (!previews.length) {
                this.flash('No import records were found');
                return;
            }
            const valid = previews.filter((preview) => preview.valid);
            const needsReview = previews.filter((preview) => !preview.valid);
            const imported = valid.length
                ? await this.advertisementInput.import(
                      valid.map((preview) => preview.input),
                      file,
                  )
                : [];
            this.requestService.mergeImported(
                imported.flatMap((result) => (result.data ? [result.data] : [])),
            );
            if (needsReview.length) {
                const fallback = needsReview[0];
                this.loadRequest(fallback.input);
                this.importIssues.set(fallback.issues.map((issue) => issue.message));
                this.reviewConfirmed.set(false);
                this.currentStep.set(0);
                this.flash(`${valid.length} imported · ${needsReview.length} need review`);
                return;
            }
            this.importIssues.set([]);
            this.flash(
                `${valid.length} advertisement request${valid.length === 1 ? '' : 's'} imported`,
            );
            await this.router.navigate(
                imported.length === 1 && imported[0].data
                    ? ['/advertisements', imported[0].data.id]
                    : ['/advertisements'],
                imported.length === 1 && imported[0].data
                    ? { queryParams: { imported: 'file' } }
                    : undefined,
            );
        } catch (error) {
            this.flash(
                (error as Error).message === 'UNSUPPORTED_IMPORT_FORMAT'
                    ? 'Choose a CSV or JSON file'
                    : 'The import could not be processed',
            );
        } finally {
            this.importing.set(false);
        }
    }
    async importGoogleSheet(): Promise<void> {
        const url = this.googleSheetUrl().trim();
        if (!url || this.importing()) {
            if (!url) this.flash('Paste a Google Sheets link first');
            return;
        }
        this.importing.set(true);
        try {
            const result = await this.advertisementInput.previewGoogleSheet(url);
            if (!result.previews.length) {
                this.flash('No import records were found in that sheet');
                return;
            }
            const valid = result.previews.filter((preview) => preview.valid);
            const needsReview = result.previews.filter((preview) => !preview.valid);
            const imported = valid.length
                ? await this.advertisementInput.importGoogleSheet(
                      valid.map((preview) => preview.input),
                      result.spreadsheetId,
                      result.gid,
                  )
                : [];
            this.requestService.mergeImported(
                imported.flatMap((importResult) => (importResult.data ? [importResult.data] : [])),
            );
            if (needsReview.length) {
                const fallback = needsReview[0];
                this.loadRequest(fallback.input);
                this.importIssues.set(fallback.issues.map((issue) => issue.message));
                this.reviewConfirmed.set(false);
                this.currentStep.set(0);
                this.flash(`${valid.length} imported · ${needsReview.length} need review`);
                return;
            }
            this.importIssues.set([]);
            this.flash('Google Sheet imported');
            await this.router.navigate(
                imported.length === 1 && imported[0].data
                    ? ['/advertisements', imported[0].data.id]
                    : ['/advertisements'],
                imported.length === 1 && imported[0].data
                    ? { queryParams: { imported: 'sheet' } }
                    : undefined,
            );
        } catch (error) {
            const description = (error as { error?: { errorDescription?: string } }).error
                ?.errorDescription;
            this.flash(description || 'The Google Sheet could not be imported');
        } finally {
            this.importing.set(false);
        }
    }
    addMessage(type: 'outside' | 'inside', headline = ''): void {
        const array = type === 'outside' ? this.outsideMessages : this.insideMessages;
        array.push(this.createMessage(headline, array.length));
    }
    deleteMessage(type: 'outside' | 'inside', index: number): void {
        const array = type === 'outside' ? this.outsideMessages : this.insideMessages;
        array.removeAt(index);
        this.renumber(array);
    }
    duplicateMessage(type: 'outside' | 'inside', index: number): void {
        const array = type === 'outside' ? this.outsideMessages : this.insideMessages;
        const value = array.at(index).getRawValue();
        array.insert(
            index + 1,
            this.createMessage(
                value.headline,
                value.sortOrder,
                value.supportingText,
                value.displayDuration,
            ),
        );
        this.renumber(array);
    }
    moveMessage(type: 'outside' | 'inside', index: number, direction: -1 | 1): void {
        const array = type === 'outside' ? this.outsideMessages : this.insideMessages;
        const target = index + direction;
        if (target < 0 || target >= array.length) return;
        const group = array.at(index);
        array.removeAt(index);
        array.insert(target, group);
        this.renumber(array);
    }
    handleFiles(event: Event, category: AssetCategory): void {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        const metadata = files.map(
            (file): AdvertisementAsset => ({
                id: crypto.randomUUID(),
                category,
                name: file.name,
                size: file.size,
                type: file.type,
                previewUrl:
                    isPlatformBrowser(this.platformId) && file.type.startsWith('image/')
                        ? URL.createObjectURL(file)
                        : '',
            }),
        );
        this.assets.update((assets) =>
            category === 'logo'
                ? [...assets.filter((asset) => asset.category !== 'logo'), ...metadata.slice(0, 1)]
                : [...assets, ...metadata],
        );
        input.value = '';
    }
    assetsFor(category: AssetCategory): AdvertisementAsset[] {
        return this.assets().filter((asset) => asset.category === category);
    }
    removeAsset(id: string): void {
        const asset = this.assets().find((item) => item.id === id);
        if (asset?.previewUrl && isPlatformBrowser(this.platformId))
            URL.revokeObjectURL(asset.previewUrl);
        this.assets.update((assets) => assets.filter((item) => item.id !== id));
    }
    fileSize(size: number): string {
        return size < 1_000_000
            ? `${(size / 1000).toFixed(0)} KB`
            : `${(size / 1_000_000).toFixed(1)} MB`;
    }
    error(control: FormControl<unknown>, label: string): string {
        if (!control.touched) return '';
        if (control.hasError('required')) return `${label} is required.`;
        if (control.hasError('email')) return 'Enter a valid email address.';
        if (control.hasError('pattern'))
            return 'Enter a complete URL beginning with http:// or https://.';
        if (control.hasError('min')) return 'Value must be at least 1.';
        return '';
    }
    async submit(): Promise<void> {
        this.updateContactValidators();
        this.form.markAllAsTouched();
        if (!this.reviewConfirmed()) {
            this.flash('Confirm that you reviewed the request before submitting');
            return;
        }
        if (
            this.form.invalid ||
            !this.validateEnabledMessages() ||
            !this.validateEnabledLengths()
        ) {
            this.flash('Please review the highlighted fields before submitting');
            return;
        }
        const input = this.toRequest('ready');
        const id = this.route.snapshot.paramMap.get('id');
        this.submitting.set(true);
        try {
            const saved = id
                ? await this.requestService.update(id, input)
                : await this.requestService.create(input, {
                      context: { source: 'form' },
                      idempotencyKey: this.submissionIdempotencyKey,
                  });
            this.storage.remove(this.draftKey);
            this.submissionIdempotencyKey = crypto.randomUUID();
            if (saved)
                await this.router.navigate(
                    this.isClientIntake()
                        ? ['/client/request', this.clientToken, 'complete']
                        : ['/advertisements', saved.id],
                );
        } catch {
            this.flash('We could not submit this brief. Please try again.');
        } finally {
            this.submitting.set(false);
        }
    }

    private seedDefaults(): void {
        if (!this.outsideMessages.length)
            this.replaceMessages(this.outsideMessages, [
                "Houston's Tex-Mex Favorite Awaits",
                'Family Recipes. Fresh Flavor.',
                'Happy Hour Starts Here.',
            ]);
        if (!this.insideMessages.length)
            this.replaceMessages(this.insideMessages, [
                'Add Queso to every order.',
                'Try a House Margarita today.',
                'Upgrade to a Jumbo Rita.',
            ]);
        if (!this.verticalVariations.length) this.syncVariations(1, ['Happy Hour Starts Here']);
    }
    private createMessage(
        headline: string,
        index: number,
        supportingText = '',
        duration = 5,
    ): MessageGroup {
        return new FormGroup({
            id: new FormControl<string>(crypto.randomUUID(), { nonNullable: true }),
            slideNumber: new FormControl(index + 1, { nonNullable: true }),
            headline: new FormControl(headline, {
                nonNullable: true,
                validators: [Validators.required, Validators.maxLength(HEADLINE_LIMIT)],
            }),
            supportingText: new FormControl(supportingText, {
                nonNullable: true,
                validators: [Validators.maxLength(SUPPORTING_LIMIT)],
            }),
            displayDuration: new FormControl(duration, {
                nonNullable: true,
                validators: [Validators.required, Validators.min(1)],
            }),
            sortOrder: new FormControl(index + 1, { nonNullable: true }),
        });
    }
    private createVariation(index: number, headline = ''): VariationGroup {
        return new FormGroup({
            id: new FormControl<string>(crypto.randomUUID(), { nonNullable: true }),
            variationNumber: new FormControl(index + 1, { nonNullable: true }),
            headline: new FormControl(headline, {
                nonNullable: true,
                validators: [Validators.required, Validators.maxLength(HEADLINE_LIMIT)],
            }),
            message: new FormControl('', { nonNullable: true }),
            supportingText: new FormControl('', {
                nonNullable: true,
                validators: [Validators.maxLength(SUPPORTING_LIMIT)],
            }),
            aspectRatio: new FormControl<'9:16'>('9:16', { nonNullable: true }),
            sortOrder: new FormControl(index + 1, { nonNullable: true }),
        });
    }
    private replaceMessages(array: FormArray<MessageGroup>, headlines: string[]): void {
        array.clear();
        headlines.forEach((headline, index) => array.push(this.createMessage(headline, index)));
    }
    private syncVariations(quantity: number, headlines: string[] = []): void {
        const safe = Math.max(0, Math.floor(quantity || 0));
        while (this.verticalVariations.length < safe)
            this.verticalVariations.push(
                this.createVariation(
                    this.verticalVariations.length,
                    headlines[this.verticalVariations.length] ?? '',
                ),
            );
        while (this.verticalVariations.length > safe)
            this.verticalVariations.removeAt(this.verticalVariations.length - 1);
    }
    private renumber(array: FormArray<MessageGroup>): void {
        array.controls.forEach((group, index) =>
            group.patchValue(
                { slideNumber: index + 1, sortOrder: index + 1 },
                { emitEvent: false },
            ),
        );
    }
    private updateContactValidators(): void {
        const contact = this.form.controls.contact.controls;
        const included = contact.included.value;
        const requiredWebsite = included.includes('website') || contact.generateQrCode.value;
        for (const [option, control] of [
            ['website', contact.website],
            ['phone', contact.phone],
            ['address', contact.address],
        ] as const) {
            const validators = option === 'website' ? [Validators.pattern(URL_PATTERN)] : [];
            if ((option === 'website' && requiredWebsite) || included.includes(option))
                validators.unshift(Validators.required);
            control.setValidators(validators);
            control.updateValueAndValidity({ emitEvent: false });
        }
    }
    private validateStep(step: number): boolean {
        this.updateContactValidators();
        const group = [
            this.form.controls.dealer,
            this.form.controls.contact,
            this.form.controls.outside,
            this.form.controls.inside,
            this.form.controls.vertical,
        ][step];
        if (group) {
            group.markAllAsTouched();
            if (group.invalid) {
                this.flash('Complete the required fields to continue');
                return false;
            }
        }
        if (
            step === 2 &&
            this.form.controls.outside.controls.enabled.value &&
            this.form.controls.outside.controls.length.value === null
        ) {
            this.flash('Choose an outside ad length');
            return false;
        }
        if (
            step === 3 &&
            this.form.controls.inside.controls.enabled.value &&
            this.form.controls.inside.controls.length.value === null
        ) {
            this.flash('Choose an inside ad length');
            return false;
        }
        if (
            step === 2 &&
            this.form.controls.outside.controls.enabled.value &&
            !this.outsideMessages.length
        ) {
            this.flash('Add at least one outside message');
            return false;
        }
        if (
            step === 3 &&
            this.form.controls.inside.controls.enabled.value &&
            !this.insideMessages.length
        ) {
            this.flash('Add at least one inside message');
            return false;
        }
        if (
            step === 4 &&
            this.form.controls.vertical.controls.enabled.value &&
            !this.verticalVariations.length
        ) {
            this.flash('Add at least one vertical variation');
            return false;
        }
        return true;
    }
    private validateEnabledMessages(): boolean {
        return (
            (!this.form.controls.outside.controls.enabled.value ||
                this.outsideMessages.length > 0) &&
            (!this.form.controls.inside.controls.enabled.value || this.insideMessages.length > 0) &&
            (!this.form.controls.vertical.controls.enabled.value ||
                this.verticalVariations.length > 0)
        );
    }
    private validateEnabledLengths(): boolean {
        return (
            (!this.form.controls.outside.controls.enabled.value ||
                this.form.controls.outside.controls.length.value !== null) &&
            (!this.form.controls.inside.controls.enabled.value ||
                this.form.controls.inside.controls.length.value !== null)
        );
    }
    private toRequest(status: 'draft' | 'ready'): AdvertisementRequestInput {
        const value = this.form.getRawValue();
        return {
            dealerNumber: value.dealer.dealerNumber,
            dealerEmail: value.dealer.dealerEmail,
            generalAdLength: value.dealer.generalAdLength,
            businessName: value.dealer.businessName,
            hasLogo: value.dealer.hasLogo,
            likesCurrentWebsite: value.dealer.likesCurrentWebsite,
            highlights: value.dealer.highlights,
            fileShareLink: value.dealer.fileShareLink,
            contactInformation: value.contact,
            outsideAd: value.outside,
            insideAd: value.inside,
            verticalAds: value.vertical,
            assets: this.assets().map((asset) => ({ ...asset, previewUrl: '' })),
            status,
        };
    }
    private loadRequest(request: AdvertisementRequestInput): void {
        this.form.controls.dealer.patchValue(
            {
                dealerNumber: request.dealerNumber,
                dealerEmail: request.dealerEmail,
                generalAdLength: request.generalAdLength,
                businessName: request.businessName,
                hasLogo: request.hasLogo,
                likesCurrentWebsite: request.likesCurrentWebsite,
                highlights: request.highlights,
                fileShareLink: request.fileShareLink,
            },
            { emitEvent: false },
        );
        this.form.controls.contact.patchValue(request.contactInformation, { emitEvent: false });
        this.form.controls.outside.patchValue(
            {
                enabled: request.outsideAd.enabled,
                length: request.outsideAd.length,
                contactOptions: request.outsideAd.contactOptions,
            },
            { emitEvent: false },
        );
        this.outsideMessages.clear();
        request.outsideAd.messages.forEach((item, index) =>
            this.outsideMessages.push(
                this.createMessage(item.headline, index, item.supportingText, item.displayDuration),
            ),
        );
        this.form.controls.inside.patchValue(
            {
                enabled: request.insideAd.enabled,
                length: request.insideAd.length,
                contactOptions: request.insideAd.contactOptions,
            },
            { emitEvent: false },
        );
        this.insideMessages.clear();
        request.insideAd.messages.forEach((item, index) =>
            this.insideMessages.push(
                this.createMessage(item.headline, index, item.supportingText, item.displayDuration),
            ),
        );
        this.form.controls.vertical.patchValue(
            {
                enabled: request.verticalAds.enabled,
                quantity: request.verticalAds.quantity,
                contactOptions: request.verticalAds.contactOptions,
            },
            { emitEvent: false },
        );
        this.verticalVariations.clear();
        request.verticalAds.variations.forEach((item, index) => {
            const group = this.createVariation(index, item.headline);
            group.patchValue(item);
            this.verticalVariations.push(group);
        });
        this.assets.set(request.assets ?? []);
    }
    private refreshPayload(): void {
        this.payloadPreview.set(this.payloadService.createPreview(this.toRequest('draft')));
    }
    private get draftKey(): string {
        return this.clientToken ? `${DRAFT_KEY}-${this.clientToken}` : DRAFT_KEY;
    }
    private flash(message: string): void {
        this.notice.set(message);
        setTimeout(() => this.notice.set(''), 2800);
    }
    private scrollTop(): void {
        if (isPlatformBrowser(this.platformId)) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
