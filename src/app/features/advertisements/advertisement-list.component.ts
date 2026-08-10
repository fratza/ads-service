import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdvertisementRequest, AdvertisementStatus } from '@core/models';
import { AdvertisementRequestService } from '@core/services';
import { EmptyStateComponent, StatusBadgeComponent } from '@shared/components';

@Component({
    selector: 'app-advertisement-list', standalone: true,
    imports: [DatePipe, EmptyStateComponent, FormsModule, RouterLink, StatusBadgeComponent],
    templateUrl: './advertisement-list.component.html', styleUrl: './advertisement-list.component.scss',
})
export class AdvertisementListComponent {
    private readonly service = inject(AdvertisementRequestService);
    readonly requests = this.service.requests;
    readonly search = signal(''); readonly dealer = signal(''); readonly status = signal('all'); readonly adType = signal('all'); readonly date = signal(''); readonly page = signal(1); readonly pageSize = 6;
    readonly filtered = computed(() => {
        const query = this.search().toLowerCase().trim(); const dealer = this.dealer().toLowerCase().trim();
        return this.requests().filter((request) => {
            const types = this.adTypes(request).map((type) => type.toLowerCase());
            return (!query || request.businessName.toLowerCase().includes(query) || request.dealerEmail.toLowerCase().includes(query))
                && (!dealer || request.dealerNumber.toLowerCase().includes(dealer))
                && (this.status() === 'all' || request.status === this.status())
                && (this.adType() === 'all' || types.includes(this.adType()))
                && (!this.date() || request.createdAt.slice(0, 10) === this.date());
        });
    });
    readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
    readonly paginated = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
    readonly statuses: (AdvertisementStatus | 'all')[] = ['all','draft','ready','submitted','queued','rendering','completed','failed','cancelled'];
    readonly Math = Math;

    setFilter(target: 'search'|'dealer'|'status'|'adType'|'date', value: string): void { this[target].set(value); this.page.set(1); }
    clearFilters(): void { this.search.set(''); this.dealer.set(''); this.status.set('all'); this.adType.set('all'); this.date.set(''); this.page.set(1); }
    nextPage(): void { this.page.update((page) => Math.min(page + 1, this.pageCount())); }
    previousPage(): void { this.page.update((page) => Math.max(page - 1, 1)); }
    delete(request: AdvertisementRequest): void { if (confirm(`Delete ${request.businessName}? This removes the local mock record.`)) this.service.delete(request.id); }
    duplicate(request: AdvertisementRequest): void { void this.service.duplicate(request.id); }
    adTypes(request: AdvertisementRequest): string[] { const result: string[] = []; if(request.outsideAd.enabled) result.push('Outside'); if(request.insideAd.enabled) result.push('Inside'); if(request.verticalAds.enabled) result.push('Vertical'); return result; }
}
