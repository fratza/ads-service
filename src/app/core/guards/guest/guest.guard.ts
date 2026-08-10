/** Angular Imports */
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

/** Local Imports */
import { AuthService } from '../../services/auth/auth.service';

/**
 * Route guard that allows access only to unauthenticated users.
 *
 * @param route - The activated route snapshot
 * @param segments - The URL segments
 * @returns {boolean} True if user is NOT authenticated, otherwise redirects to root
 *
 * @remarks
 * This is a functional guard (Angular 15+) used with `canMatch`.
 * Prevents authenticated users from accessing public pages like login.
 * Redirects authenticated users to root (/).
 */
export const guestGuard: CanMatchFn = (route, segments) => {
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

    if (isAuthenticated) {
        router.navigate(['/']);
        return false;
    }

    return true;
};
