import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

interface NavigationItem { label: string; route: string; icon: string; exact?: boolean; }

@Component({
    selector: 'app-shell', standalone: true,
    imports: [RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './app-shell.component.html', styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
    readonly sidebarOpen = signal(false);
    readonly pageTitle = signal('Dashboard');
    readonly breadcrumb = signal('Overview');
    readonly navigation: NavigationItem[] = [
        { label: 'Dashboard', route: '/dashboard', icon: 'grid', exact: true },
        { label: 'Advertisement Requests', route: '/advertisements', icon: 'ads', exact: true },
        { label: 'Create Advertisement', route: '/advertisements/new', icon: 'plus' },
        { label: 'Revisions', route: '/revisions', icon: 'revision' },
        { label: 'Trivia', route: '/trivia', icon: 'trivia' },
        { label: 'Settings', route: '/settings', icon: 'settings' },
    ];

    constructor(router: Router) {
        const update = (url: string): void => {
            if (url.includes('/new')) { this.pageTitle.set('Create advertisement'); this.breadcrumb.set('New request'); }
            else if (url.includes('/edit')) { this.pageTitle.set('Edit advertisement'); this.breadcrumb.set('Edit request'); }
            else if (/\/advertisements\/[^/]+/.test(url)) { this.pageTitle.set('Request details'); this.breadcrumb.set('Details'); }
            else if (url.startsWith('/advertisements')) { this.pageTitle.set('Advertisement requests'); this.breadcrumb.set('All requests'); }
            else if (url.startsWith('/trivia')) { this.pageTitle.set('Trivia'); this.breadcrumb.set('Video generator'); }
            else if (url.startsWith('/revisions')) { this.pageTitle.set('Video revisions'); this.breadcrumb.set('Creatomate studio'); }
            else if (url.startsWith('/settings')) { this.pageTitle.set('Settings'); this.breadcrumb.set('Workspace'); }
            else { this.pageTitle.set('Dashboard'); this.breadcrumb.set('Overview'); }
            this.sidebarOpen.set(false);
        };
        update(router.url);
        router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => update(event.urlAfterRedirects));
    }

    toggleSidebar(): void { this.sidebarOpen.update((open) => !open); }
}
