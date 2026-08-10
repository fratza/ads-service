import { Component, input } from '@angular/core';
import { AdvertisementStatus } from '@core/models';

@Component({
    selector: 'app-status-badge',
    standalone: true,
    template: `<span class="status-badge" [class]="'status-badge status-badge--' + status()"><span class="status-badge__dot"></span>{{ status() }}</span>`,
    styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent { readonly status = input.required<AdvertisementStatus>(); }
