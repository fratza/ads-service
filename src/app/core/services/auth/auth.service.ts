/** Angular Imports */
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

/**
 * Authentication service for managing user authentication state.
 *
 * @remarks
 * Provides centralized authentication state management using Angular signals.
 * Used by route guards to determine access control.
 */
@Injectable({
    providedIn: 'root',
})
export class AuthService {
    /**
     * Platform ID to check if running in browser
     * @type {Object}
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Signal indicating whether the user is authenticated
     * @type {WritableSignal<boolean>}
     */
    private readonly _isAuthenticated = signal<boolean>(false);

    /**
     * Read-only computed signal for authentication state
     * @type {Signal<boolean>}
     */
    public readonly isAuthenticated = this._isAuthenticated.asReadonly();

    /**
     * Checks if user has a valid authentication session.
     *
     * @returns {boolean} True if user is authenticated
     *
     * @remarks
     * Currently checks for session token in sessionStorage.
     * In production, this should validate token expiry and integrity.
     */
    public checkAuthStatus(): boolean {
        if (!isPlatformBrowser(this.platformId)) {
            return false;
        }
        const token = sessionStorage.getItem('auth_token');
        const isAuth = !!token;
        this._isAuthenticated.set(isAuth);
        return isAuth;
    }

    /**
     * Sets the authentication state to authenticated.
     *
     * @param token - Authentication token to store
     * @returns {void}
     *
     * @remarks
     * Should be called after successful login with token from BFF.
     */
    public setAuthenticated(token: string): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        sessionStorage.setItem('auth_token', token);
        this._isAuthenticated.set(true);
    }

    /**
     * Clears authentication state and removes stored credentials.
     *
     * @returns {void}
     *
     * @remarks
     * Should be called on logout or session expiration.
     */
    public clearAuthentication(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        sessionStorage.removeItem('auth_token');
        this._isAuthenticated.set(false);
    }
}
