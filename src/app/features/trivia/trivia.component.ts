import { DatePipe, SlicePipe, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import {
    TRIVIA_CATEGORIES,
    TRIVIA_SUCCESS_STATUSES,
    TRIVIA_TERMINAL_STATUSES,
    TriviaCategory,
    TriviaRequestStatus,
    TriviaService,
} from '@core/services';

@Component({
    selector: 'app-trivia',
    standalone: true,
    imports: [DatePipe, SlicePipe],
    templateUrl: './trivia.component.html',
    styleUrl: './trivia.component.scss',
})
export class TriviaComponent implements OnDestroy {
    private readonly triviaService = inject(TriviaService);
    private readonly platformId = inject(PLATFORM_ID);
    readonly categories = TRIVIA_CATEGORIES;
    readonly successStatuses = TRIVIA_SUCCESS_STATUSES;
    readonly category = signal<TriviaCategory>(TRIVIA_CATEGORIES[0]);
    readonly quantity = signal(1);
    readonly submitting = signal(false);
    readonly error = signal('');
    readonly requests = signal<TriviaRequestStatus[]>([]);
    readonly loadingRequests = signal(true);
    readonly generateModalOpen = signal(false);
    private stopWatching?: () => void;

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            // One-off snapshot so past batches show without holding a
            // stream open; the stream only runs while something is active.
            void this.triviaService
                .fetchRequests()
                .then((requests) => {
                    this.requests.set(requests);
                    if (requests.some((request) => !this.isTerminal(request))) this.startWatching();
                })
                .finally(() => this.loadingRequests.set(false));
        } else {
            this.loadingRequests.set(false);
        }
    }

    setCategory(value: string): void {
        this.category.set(value as TriviaCategory);
    }

    setQuantity(value: string): void {
        const parsed = Number(value);
        this.quantity.set(Number.isFinite(parsed) ? parsed : 1);
    }

    openGenerateModal(): void {
        this.error.set('');
        this.generateModalOpen.set(true);
    }

    closeGenerateModal(): void {
        if (this.submitting()) return;
        this.generateModalOpen.set(false);
    }

    async generate(): Promise<void> {
        if (this.submitting() || this.quantity() < 1) return;
        this.submitting.set(true);
        this.error.set('');
        try {
            await this.triviaService.generate(this.category(), Math.floor(this.quantity()));
            this.startWatching();
            this.generateModalOpen.set(false);
        } catch (error) {
            this.error.set(this.triviaService.errorMessage(error));
        } finally {
            this.submitting.set(false);
        }
    }

    hasActiveRequest(): boolean {
        return this.requests().some((request) => !this.isTerminal(request));
    }

    private startWatching(): void {
        if (this.stopWatching) return;
        this.stopWatching = this.triviaService.watchRequests((requests) => {
            this.requests.set(requests);
            if (requests.every((request) => this.isTerminal(request))) {
                this.stopWatching?.();
                this.stopWatching = undefined;
            }
        });
    }

    isTerminal(request: TriviaRequestStatus): boolean {
        return (
            request.state === 'error' ||
            (request.state === 'job' &&
                !!request.job &&
                TRIVIA_TERMINAL_STATUSES.includes(request.job.status))
        );
    }

    statusLabel(request: TriviaRequestStatus): string {
        if (request.state === 'pending') return 'generating';
        if (request.state === 'error') return 'error';
        return request.job?.status ?? 'unknown';
    }

    progressPercent(progress: number): number {
        // trivias-api reports progress as a 0-1 fraction; guard in case it
        // ever switches to already-a-percentage.
        const percent = progress > 1 ? progress : progress * 100;
        return Math.round(Math.min(100, Math.max(0, percent)));
    }

    ngOnDestroy(): void {
        this.stopWatching?.();
    }
}
