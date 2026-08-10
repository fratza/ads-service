import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdvertisementRequestService } from '@core/services';
import { StatusBadgeComponent } from '@shared/components';

@Component({
    selector: 'app-dashboard', standalone: true,
    imports: [DatePipe, RouterLink, StatusBadgeComponent],
    templateUrl: './dashboard.component.html', styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
    private readonly requestService = inject(AdvertisementRequestService);
    readonly requests = this.requestService.requests;
    readonly recentRequests = computed(() => this.requests().slice(0, 5));
    readonly stats = computed(() => {
        const requests = this.requests();
        return [
            { label: 'Total requests', value: requests.length, icon: 'stack', tone: 'blue', delta: '12% this month' },
            { label: 'Draft requests', value: requests.filter((r) => r.status === 'draft').length, icon: 'draft', tone: 'gray', delta: 'Needs attention' },
            { label: 'Ready requests', value: requests.filter((r) => r.status === 'ready').length, icon: 'check', tone: 'green', delta: 'Ready for Creatomate' },
            { label: 'Rendering', value: requests.filter((r) => ['queued', 'rendering'].includes(r.status)).length, icon: 'render', tone: 'amber', delta: 'In progress' },
            { label: 'Completed', value: requests.filter((r) => r.status === 'completed').length, icon: 'complete', tone: 'teal', delta: '40% completion rate' },
            { label: 'Failed', value: requests.filter((r) => r.status === 'failed').length, icon: 'alert', tone: 'red', delta: 'Review required' },
        ];
    });
    readonly distribution = computed(() => {
        const total = Math.max(this.requests().length, 1);
        return [
            { label: 'Draft', count: this.requests().filter((r) => r.status === 'draft').length, color: '#98a2b3' },
            { label: 'Ready', count: this.requests().filter((r) => r.status === 'ready').length, color: '#8dcb2c' },
            { label: 'In progress', count: this.requests().filter((r) => ['submitted','queued','rendering'].includes(r.status)).length, color: '#4064b4' },
            { label: 'Completed', count: this.requests().filter((r) => r.status === 'completed').length, color: '#2ea66f' },
            { label: 'Failed', count: this.requests().filter((r) => r.status === 'failed').length, color: '#e73535' },
        ].map((item) => ({ ...item, percent: Math.round(item.count / total * 100) }));
    });

    adTypes(request: ReturnType<AdvertisementRequestService['requests']>[number]): string[] {
        const types: string[] = [];
        if (request.outsideAd.enabled) types.push('Outside');
        if (request.insideAd.enabled) types.push('Inside');
        if (request.verticalAds.enabled) types.push('Vertical');
        return types;
    }
}
