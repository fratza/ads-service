import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export const TRIVIA_CATEGORIES = [
    'Medical',
    'Travel & Tourism',
    'Retail',
    'Bar/Restaurant',
    'Professional Services',
] as const;

export type TriviaCategory = (typeof TRIVIA_CATEGORIES)[number];

// trivias-api has used both "completed" and "done" for a finished render
// job across versions; treat either as success.
export const TRIVIA_SUCCESS_STATUSES = ['completed', 'done'];
export const TRIVIA_TERMINAL_STATUSES = [...TRIVIA_SUCCESS_STATUSES, 'failed'];

export interface TriviaJobStatus {
    id: string;
    status: string;
    progress: number;
    downloadUrl: string | null;
    error?: string | null;
    skippedRows?: Array<{ index: number; reason: string; question?: string }>;
}

export interface TriviaRequestStatus {
    requestId: string;
    category: string;
    quantity: number;
    createdAt: string;
    state: 'pending' | 'error' | 'job';
    error: string | null;
    job: TriviaJobStatus | null;
}

@Injectable({ providedIn: 'root' })
export class TriviaService {
    private readonly http = inject(HttpClient);

    async generate(category: TriviaCategory, quantity: number): Promise<void> {
        await firstValueFrom(this.http.post('/api/trivia/generate', { category, quantity }));
    }

    /** One-off snapshot of every tracked trivia request. */
    fetchRequests(): Promise<TriviaRequestStatus[]> {
        return firstValueFrom(this.http.get<TriviaRequestStatus[]>('/api/trivia/jobs'));
    }

    /**
     * Opens a Server-Sent Events stream instead of polling: one connection
     * stays open for as long as the page is up and the server pushes the
     * full list of tracked trivia requests every few seconds.
     * Returns a function that closes the connection (e.g. on destroy).
     */
    watchRequests(onUpdate: (requests: TriviaRequestStatus[]) => void): () => void {
        const source = new EventSource('/api/trivia/events');
        source.onmessage = (event) => {
            try {
                onUpdate(JSON.parse(event.data) as TriviaRequestStatus[]);
            } catch {
                // Ignore a malformed event; the next one will arrive shortly.
            }
        };
        return () => source.close();
    }

    errorMessage(error: unknown): string {
        if (error instanceof HttpErrorResponse)
            return error.error?.errorDescription || error.message;
        return error instanceof Error
            ? error.message
            : 'Unable to start the trivia generation workflow.';
    }
}
