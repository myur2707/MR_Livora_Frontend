import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, afterEach } from 'vitest';
import { OnboardingApi, onboardingError, displaySocietyTime } from './onboarding';
import { authInterceptor } from './auth-interceptor';
import { AuthState } from './auth-state';
describe('onboarding client boundary', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });
  it('formats UTC instants in the society timezone rather than the browser timezone', () => {
    expect(displaySocietyTime('2026-01-01T00:00:00.000Z', 'Asia/Kolkata')).toContain('5:30');
    expect(displaySocietyTime('2026-01-01T00:00:00.000Z', 'UTC')).toContain('12:00');
  });
  it('maps safe conflicts and ignores arbitrary server detail', () => {
    expect(
      onboardingError(
        new HttpErrorResponse({
          error: { error: { code: 'REVISION_CONFLICT', message: 'SELECT secret' } },
        }),
      ),
    ).toContain('Refresh');
    expect(
      onboardingError(new HttpErrorResponse({ error: { error: { message: 'SELECT secret' } } })),
    ).not.toContain('SELECT');
  });
  it('loads five societies per page by default', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const api = TestBed.inject(OnboardingApi);
    const requests = TestBed.inject(HttpTestingController);
    const result = api.societies();
    const request = requests.expectOne('/api/v1/platform/societies?page=1&pageSize=5');
    request.flush({ items: [], total: 0, page: 1, pageSize: 5 });
    await result;
    requests.verify();
  });
  it('encodes society status and search filters', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const api = TestBed.inject(OnboardingApi);
    const requests = TestBed.inject(HttpTestingController);
    const result = api.societies(2, 'ACTIVE', 'Varada Heights');
    const request = requests.expectOne(
      '/api/v1/platform/societies?page=2&pageSize=5&status=ACTIVE&search=Varada%20Heights',
    );
    request.flush({ items: [], total: 0, page: 2, pageSize: 5 });
    await result;
    requests.verify();
  });
  it('writes use same-origin CSRF and leave authorization to the server', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    TestBed.inject(AuthState).csrf.set('synthetic-csrf');
    const api = TestBed.inject(OnboardingApi);
    const requests = TestBed.inject(HttpTestingController);
    const result = api.post('/onboarding/societies/10/activate/confirm', {
      revision: '3',
      confirmed: true,
    });
    requests.expectOne('/api/v1/auth/csrf').flush({ csrfToken: 'synthetic-csrf' });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const request = requests.expectOne('/api/v1/onboarding/societies/10/activate/confirm');
    expect(request.request.headers.get('X-CSRF-Token')).toBe('synthetic-csrf');
    expect(request.request.cache).toBe('no-store');
    expect(request.request.body).toEqual({ revision: '3', confirmed: true });
    request.flush(null);
    await result;
    requests.verify();
  });
});
