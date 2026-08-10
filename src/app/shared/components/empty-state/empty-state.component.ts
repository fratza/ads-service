import { Component, input } from '@angular/core';

@Component({
    selector: 'app-empty-state', standalone: true,
    template: `<div class="empty"><div class="empty__icon">⌕</div><h3>{{ title() }}</h3><p>{{ description() }}</p></div>`,
    styles: [`.empty{text-align:center;padding:3rem 1rem;color:#667085}.empty__icon{margin:auto auto .75rem;display:grid;place-items:center;width:3rem;height:3rem;border-radius:1rem;background:#f0f2f9;color:#4064b4;font-size:1.5rem}.empty h3{margin:0;color:#17213c}.empty p{margin:.35rem 0 0;font-size:.9rem}`],
})
export class EmptyStateComponent { readonly title = input('Nothing here yet'); readonly description = input('Try adjusting your filters.'); }
