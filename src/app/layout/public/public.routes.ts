/** Angular Imports */
import { Routes } from '@angular/router';

export const PUBLIC_ROUTES: Routes = [
    {
        path: 'login',
        loadComponent: () =>
            import('@features/login').then((m) => m.LoginComponent),
    },
];
