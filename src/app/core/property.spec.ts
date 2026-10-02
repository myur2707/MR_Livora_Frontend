import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, afterEach } from 'vitest';
import { PropertyApi, propertyError } from './property';
import { authInterceptor } from './auth-interceptor';
import { AuthState } from './auth-state';
import { AuthService } from './auth';
import { managementGuard } from './auth-guards';
describe('property client boundary', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('maps conflicts without echoing arbitrary server internals', () => {
    expect(
      propertyError(
        new HttpErrorResponse({
          error: { error: { code: 'OCCUPANCY_OVERLAP', message: 'SQL secret' } },
        }),
      ),
    ).toContain('overlapping');
    expect(
      propertyError(
        new HttpErrorResponse({
          error: { error: { code: 'ARCHIVE_DEPENDENCIES', message: 'SQL secret' } },
        }),
      ),
    ).toContain('archive');
    expect(
      propertyError(new HttpErrorResponse({ error: { error: { message: 'SQL secret' } } })),
    ).not.toContain('SQL');
  });
  it('paginated reads are no-store and edits use memory CSRF without client tenant fields', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { prepare: () => Promise.resolve() } },
      ],
    });
    const api = TestBed.inject(PropertyApi);
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthState).csrf.set('synthetic-csrf');
    const read = api.list('persons', { page: 2, pageSize: 20, q: 'A & B' });
    const req = http.expectOne((r) => r.url === '/api/v1/society/persons');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('q')).toBe('A & B');
    expect(req.request.cache).toBe('no-store');
    expect(req.request.params.has('societyId')).toBe(false);
    req.flush({ items: [], total: 0, page: 2, pageSize: 20 });
    await read;
    const change = api.put('buildings/1', {
      name: 'New name',
      code: 'A',
      version: 'synthetic-version',
    });
    await Promise.resolve();
    const put = http.expectOne('/api/v1/society/buildings/1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.headers.get('X-CSRF-Token')).toBe('synthetic-csrf');
    put.flush(null);
    await change;
    http.verify();
  });
  it('management guard requires society admin role and permission, including for platform admins', async () => {
    for (const [roles, permissions, allowed] of [
      [['RESIDENT'], ['society.members.manage'], false],
      [['COMMITTEE_ADMIN'], [], false],
      [['COMMITTEE_ADMIN'], ['society.members.manage'], true],
    ] as const) {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          {
            provide: AuthService,
            useValue: {
              refresh: () =>
                Promise.resolve({ platformAdmin: true, activeSociety: { roles, permissions } }),
            },
          },
        ],
      });
      const result = await TestBed.runInInjectionContext(() => managementGuard());
      expect(result === true).toBe(allowed);
      TestBed.resetTestingModule();
    }
  });
});
