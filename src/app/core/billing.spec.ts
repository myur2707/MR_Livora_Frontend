import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BillingApi, billingError, choiceLabel } from './billing';
import { AuthState } from './auth-state';
import { AuthService } from './auth';
import { authInterceptor } from './auth-interceptor';
import { provideRouter } from '@angular/router';
import { describe, it, expect, afterEach } from 'vitest';
describe('billing requests and safe feedback', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('keeps money as strings, sends CSRF and encodes paginated filters without tenant identifiers', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { prepare: () => Promise.resolve() } },
      ],
    });
    const state = TestBed.inject(AuthState);
    state.csrf.set('test-csrf');
    const api = TestBed.inject(BillingApi);
    const http = TestBed.inject(HttpTestingController);
    const listing = api.list('flats', 2, 'A & B');
    const get = http.expectOne('/api/v1/society/billing/flats?page=2&pageSize=20&q=A+%26+B');
    get.flush({ items: [], total: 0, page: 2, pageSize: 20 });
    await listing;
    const body = {
      periodId: '1',
      flatIds: ['2'],
      discounts: [],
      previewHash: 'a'.repeat(64),
      idempotencyKey: 'synthetic-request',
    };
    const result = api.post('generate', body);
    await Promise.resolve();
    const post = http.expectOne('/api/v1/society/billing/generate');
    expect(post.request.body).toEqual(body);
    expect(post.request.headers.get('X-CSRF-Token')).toBe('test-csrf');
    expect(post.request.cache).toBe('no-store');
    post.flush({ billCount: 1 });
    await result;
    http.verify();
  });
  it('renders meaningful stale-preview errors without exposing arbitrary server messages', () => {
    expect(
      billingError(
        new HttpErrorResponse({
          error: { error: { code: 'PREVIEW_CHANGED', message: 'private SQL' } },
        }),
      ),
    ).toContain('new preview');
    expect(
      billingError(new HttpErrorResponse({ error: { error: { message: 'private SQL' } } })),
    ).not.toContain('private SQL');
    expect(choiceLabel({ id: '1', buildingCode: 'A', flatNumber: '101' })).toBe('A / 101');
  });
});
