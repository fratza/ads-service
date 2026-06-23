/** Angular Imports */
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

/** Local Imports */
import { AuthService } from '../../services/auth/auth.service';

/**
 * Route guard that allows access only to authenticated users.
 *
 * @param route - The activated route snapshot
 * @param segments - The URL segments
 * @returns {boolean} True if user is authenticated, otherwise redirects to login
 *
 * @remarks
 * This is a functional guard (Angular 15+) used with `canMatch`.
 * Redirects unauthenticated users to /login.
 */
export const authGuard: CanMatchFn = (route, segments) => {
    /**
     * Authentication service instance
     * @type {AuthService}
     */
    const authService: AuthService = inject(AuthService);

    /**
     * Router service for navigation
     * @type {Router}
     */
    const router: Router = inject(Router);

    const isAuthenticated = authService.checkAuthStatus();

    if (!isAuthenticated) {
        router.navigate(['/login']);
        return false;
    }

    return true;
};
