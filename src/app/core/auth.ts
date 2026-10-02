import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthState } from './auth-state';
import type { SessionIdentity } from './auth-state';

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Unable to connect. Please try again.';
  const payload: unknown = error.error;
  const nested =
    typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
  const code =
    typeof nested === 'object' && nested !== null && 'code' in nested ? nested.code : null;
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Email or password is incorrect.';
    case 'RESET_INVALID':
      return 'This reset link is invalid or expired. Request a new link.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please try again later.';
    case 'CSRF_INVALID':
      return 'Your session expired. Please try again.';
    case 'ACCESS_DENIED':
      return 'This workspace is unavailable to your account.';
    case 'INVALID_REQUEST':
      return 'Check your details and try again.';
    default:
      return 'Unable to complete your request. Please try again.';
  }
}
export function safeReturnUrl(value: string | null): string {
  return value &&
    [
      '/workspace',
      '/join-society',
      '/platform/dashboard',
      '/platform/societies',
      '/society/dashboard',
      '/ui',
    ].includes(value)
    ? value
    : '/workspace';
}
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly state = inject(AuthState);
  private readonly http = inject(HttpClient);
  async refresh(): Promise<SessionIdentity | null> {
    try {
      const identity = await firstValueFrom(this.http.get<SessionIdentity>('/api/v1/auth/session'));
      this.state.identity.set(identity);
      return identity;
    } catch (error) {
      this.state.identity.set(null);
      if (error instanceof HttpErrorResponse && error.status === 401) return null;
      throw error;
    }
  }
  async prepare(): Promise<void> {
    const result = await firstValueFrom(this.http.get<{ csrfToken: string }>('/api/v1/auth/csrf'));
    this.state.csrf.set(result.csrfToken);
  }
  async login(email: string, password: string): Promise<void> {
    await this.prepare();
    const result = await firstValueFrom(
      this.http.post<{ csrfToken: string }>('/api/v1/auth/login', { email, password }),
    );
    this.state.csrf.set(result.csrfToken);
    await this.refresh();
  }
  async logout(): Promise<void> {
    await this.prepare();
    await firstValueFrom(this.http.post<void>('/api/v1/auth/logout', {}));
    this.state.clear();
  }
  async forgot(email: string): Promise<void> {
    await this.prepare();
    await firstValueFrom(this.http.post('/api/v1/auth/forgot-password', { email }));
  }
  async reset(token: string, password: string): Promise<void> {
    await this.prepare();
    await firstValueFrom(this.http.post<void>('/api/v1/auth/reset-password', { token, password }));
    this.state.clear();
  }
  async selectSociety(societyId: string | null): Promise<void> {
    await this.prepare();
    await firstValueFrom(this.http.post<void>('/api/v1/auth/society-context', { societyId }));
    await this.refresh();
  }
}
