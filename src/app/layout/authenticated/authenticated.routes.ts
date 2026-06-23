/** Angular Imports */
import { Routes } from '@angular/router';

/** Local Imports */
import { DashboardComponent } from '@features/dashboard';

export const AUTHENTICATED_ROUTES: Routes = [
    {
        path: '',
        component: DashboardComponent,
    },
];
