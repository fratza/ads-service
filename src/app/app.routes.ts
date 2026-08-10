import { Routes } from '@angular/router';
import { AppShellComponent } from '@layouts';

export const routes: Routes = [
    {
        path: 'client/request/:token/complete',
        loadComponent: () => import('@features/advertisements').then((module) => module.ClientRequestCompleteComponent),
    },
    {
        path: 'client/request/:token',
        loadComponent: () => import('@features/advertisements').then((module) => module.AdvertisementFormComponent),
    },
    {
        path: '', component: AppShellComponent,
        children: [
            { path: 'dashboard', loadComponent: () => import('@features/dashboard').then((module) => module.DashboardComponent) },
            { path: 'advertisements', loadComponent: () => import('@features/advertisements').then((module) => module.AdvertisementListComponent) },
            { path: 'advertisements/new', loadComponent: () => import('@features/advertisements').then((module) => module.AdvertisementFormComponent) },
            { path: 'advertisements/:id/edit', loadComponent: () => import('@features/advertisements').then((module) => module.AdvertisementFormComponent) },
            { path: 'advertisements/:id', loadComponent: () => import('@features/advertisements').then((module) => module.AdvertisementDetailComponent) },
            { path: 'trivia', loadComponent: () => import('@features/trivia').then((module) => module.TriviaComponent) },
            { path: 'settings', loadComponent: () => import('@features/settings').then((module) => module.SettingsComponent) },
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
        ],
    },
    { path: '**', redirectTo: 'dashboard' },
];
