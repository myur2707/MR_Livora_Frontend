import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptors,
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { describe, it, expect, afterEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService, authErrorMessage, safeReturnUrl } from './auth';
import { AuthState } from './auth-state';
import { authInterceptor } from './auth-interceptor';
import { platformGuard, societyGuard } from './auth-guards';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
  return {
    auth: TestBed.inject(AuthService),
    state: TestBed.inject(AuthState),
    http: TestBed.inject(HttpClient),
    requests: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
  };
}
afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
  TestBed.resetTestingModule();
});
describe('authentication boundary', () => {
  it('attaches CSRF/cookies only to same-origin API writes and bypasses third parties', async () => {
    const { state, http, requests } = setup();
    state.csrf.set('memory-only-csrf');
    const api = firstValueFrom(http.post('/api/v1/auth/logout', {}));
    const pending = requests.expectOne('/api/v1/auth/logout');
    expect(pending.request.headers.get('X-CSRF-Token')).toBe('memory-only-csrf');
    expect(pending.request.withCredentials).toBe(true);
    expect(pending.request.cache).toBe('no-store');
    pending.flush(null);
    await api;
    const external = firstValueFrom(http.post('https://external.example/api/v1/collect', {}));
    const thirdParty = requests.expectOne('https://external.example/api/v1/collect');
    expect(thirdParty.request.headers.has('X-CSRF-Token')).toBe(false);
    expect(thirdParty.request.withCredentials).toBe(false);
    thirdParty.flush({});
    await external;
  });
  it('forgets identity after session expiry and never accepts an error as authenticated state', async () => {
    const { auth, state, requests } = setup();
    const load = auth.refresh();
    requests
      .expectOne('/api/v1/auth/session')
      .flush({ error: { code: 'AUTH_REQUIRED' } }, { status: 401, statusText: 'Unauthorized' });
    expect(await load).toBeNull();
    expect(state.identity()).toBeNull();
    const offline = auth.refresh();
    requests
      .expectOne('/api/v1/auth/session')
      .flush(null, { status: 503, statusText: 'Unavailable' });
    await expect(offline).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(state.identity()).toBeNull();
  });
  it('platform and society guards use current server access and fail closed', async () => {
    const { requests, router } = setup();
    const platform = TestBed.runInInjectionContext(() => platformGuard());
    requests
      .expectOne('/api/v1/auth/session')
      .flush({ userId: '1', platformAdmin: false, memberships: [], activeSociety: null });
    const platformResult = await platform;
    expect(platformResult).toBeInstanceOf(UrlTree);
    if (!(platformResult instanceof UrlTree)) throw new Error('Expected workspace redirect.');
    expect(router.serializeUrl(platformResult)).toBe('/workspace');
    const society = TestBed.runInInjectionContext(() => societyGuard());
    requests
      .expectOne('/api/v1/auth/session')
      .flush({ userId: '1', platformAdmin: true, memberships: [], activeSociety: null });
    const societyResult = await society;
    expect(societyResult).toBeInstanceOf(UrlTree);
    if (!(societyResult instanceof UrlTree)) throw new Error('Expected workspace redirect.');
    expect(router.serializeUrl(societyResult)).toBe('/workspace');
  });
  it('maps reviewed error codes, ignores arbitrary server text and rejects open redirects', () => {
    setup();
    expect(
      authErrorMessage(
        new HttpErrorResponse({
          status: 401,
          error: { error: { code: 'INVALID_CREDENTIALS', message: '<private internals>' } },
        }),
      ),
    ).toBe('Email or password is incorrect.');
    expect(
      authErrorMessage(
        new HttpErrorResponse({
          status: 500,
          error: { error: { message: 'SELECT password_hash' } },
        }),
      ),
    ).not.toContain('SELECT');
    for (const value of [
      'https://evil.example',
      '//evil.example',
      '/api/v1/secret',
      '/login?next=https://evil.example',
    ])
      expect(safeReturnUrl(value)).toBe('/workspace');
    expect(safeReturnUrl('/society/dashboard')).toBe('/society/dashboard');
  });
});
