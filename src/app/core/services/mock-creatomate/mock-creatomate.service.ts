import { Injectable, inject, signal } from '@angular/core';
import { AdvertisementRequest, MockCreatomateRenderJob, MockRenderOutput } from '@core/models';
import { AdvertisementRequestService } from '@core/services/advertisement-request/advertisement-request.service';
import { StorageService } from '@core/services/storage/storage.service';

const JOBS_KEY = 'ntv-mock-creatomate-render-jobs';

@Injectable({ providedIn: 'root' })
export class MockCreatomateService {
    private readonly storage = inject(StorageService);
    private readonly requests = inject(AdvertisementRequestService);
    private readonly state = signal<MockCreatomateRenderJob[]>(this.storage.get<MockCreatomateRenderJob[]>(JOBS_KEY) ?? []);

    jobsFor(requestId: string): MockCreatomateRenderJob[] {
        return this.state().filter((job) => job.requestId === requestId);
    }

    start(request: AdvertisementRequest): MockCreatomateRenderJob[] {
        const outputs: Array<{ output: MockRenderOutput; label: string; enabled: boolean }> = [
            { output: 'outside', label: 'Outside advertisement', enabled: request.outsideAd.enabled },
            { output: 'inside', label: 'Inside advertisement', enabled: request.insideAd.enabled },
            { output: 'vertical', label: 'Vertical 9:16 advertisement', enabled: request.verticalAds.enabled },
        ];
        const submittedAt = new Date().toISOString();
        const jobs = outputs.filter(({ enabled }) => enabled).map(({ output, label }, index): MockCreatomateRenderJob => ({
            id: `demo-${request.id}-${output}-${Date.now() + index}`,
            requestId: request.id,
            output,
            label,
            templateId: `demo-template-${output}-001`,
            status: 'queued',
            progress: 8,
            submittedAt,
            completedAt: null,
        }));

        this.persist([...this.state().filter((job) => job.requestId !== request.id), ...jobs]);
        this.requests.updateStatus(request.id, 'queued');
        jobs.forEach((job, index) => {
            setTimeout(() => this.advance(job.id, 'rendering', 42), 700 + index * 220);
            setTimeout(() => this.advance(job.id, 'rendering', 76), 1700 + index * 280);
            setTimeout(() => this.complete(job.id, request.id), 3000 + index * 450);
        });
        return jobs;
    }

    private advance(id: string, status: MockCreatomateRenderJob['status'], progress: number): void {
        this.persist(this.state().map((job) => job.id === id ? { ...job, status, progress } : job));
        const job = this.state().find((item) => item.id === id);
        if (job) this.requests.updateStatus(job.requestId, 'rendering');
    }

    private complete(id: string, requestId: string): void {
        this.persist(this.state().map((job) => job.id === id ? { ...job, status: 'completed', progress: 100, completedAt: new Date().toISOString() } : job));
        if (this.jobsFor(requestId).every((job) => job.status === 'completed')) this.requests.updateStatus(requestId, 'completed');
    }

    private persist(jobs: MockCreatomateRenderJob[]): void {
        this.state.set(jobs);
        this.storage.set(JOBS_KEY, jobs);
    }
}
