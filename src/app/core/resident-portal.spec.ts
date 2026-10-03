import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { afterEach, describe, it, expect } from 'vitest';
import { ResidentPortalApi } from './resident-portal';
import { AuthService } from './auth';
import { AuthState } from './auth-state';
import type { SessionIdentity } from './auth-state';
import { authInterceptor } from './auth-interceptor';
import { ResidentView } from '../features/resident-portal/view';
@Component({ template: '' })
class ResidentTestHost {
  readonly view = new ResidentView<string>();
}
const identity = (societyId: string): SessionIdentity => ({
  userId: '1',
  email: 'own@example.invalid',
  platformAdmin: false,
  memberships: [],
  expiresAt: '2099-01-01T00:00:00Z',
  activeSociety: {
    societyId,
    membershipId: '2',
    name: 'Synthetic',
    roles: ['RESIDENT'],
    permissions: ['society.dashboard.read'],
  },
});
describe('resident private request lifecycle', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('uses no-store requests, paginated filters and CSRF without client identity or tenant fields', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { prepare: () => Promise.resolve() } },
      ],
    });
    const state = TestBed.inject(AuthState);
    state.csrf.set('memory-csrf');
    const api = TestBed.inject(ResidentPortalApi),
      http = TestBed.inject(HttpTestingController);
    const listing = api.list('bills', 2, { flatId: '3', status: 'OUTSTANDING' });
    const get = http.expectOne(
      '/api/v1/society/resident/bills?page=2&pageSize=20&flatId=3&status=OUTSTANDING',
    );
    expect(get.request.cache).toBe('no-store');
    get.flush({ items: [], total: 0, page: 2, pageSize: 20 });
    await listing;
    const fields = { flatId: '3', title: 'Repair', description: 'Plain text' };
    const submission = api.complain(fields);
    await Promise.resolve();
    const post = http.expectOne('/api/v1/society/resident/complaints');
    expect(post.request.body).toEqual(fields);
    expect(post.request.headers.get('X-CSRF-Token')).toBe('memory-csrf');
    expect(post.request.cache).toBe('no-store');
    post.flush({ id: '7' });
    await submission;
    http.verify();
  });
  it('clears data when context changes and ignores old-society responses', async () => {
    const state = TestBed.inject(AuthState);
    state.identity.set(identity('A'));
    const fixture = TestBed.createComponent(ResidentTestHost);
    fixture.detectChanges();
    let finish: (value: string) => void = () => {
      throw new Error('Request not started');
    };
    const pending = fixture.componentInstance.view.load(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    state.identity.set(identity('B'));
    fixture.detectChanges();
    finish('Private A data');
    await pending;
    expect(fixture.componentInstance.view.value()).toBeNull();
    await fixture.componentInstance.view.load(() => Promise.resolve('B data'));
    expect(fixture.componentInstance.view.value()).toBe('B data');
    state.clear();
    fixture.detectChanges();
    expect(fixture.componentInstance.view.value()).toBeNull();
  });
  it('destroyed pages cannot repopulate private values after a late response', async () => {
    TestBed.inject(AuthState).identity.set(identity('A'));
    const fixture = TestBed.createComponent(ResidentTestHost);
    fixture.detectChanges();
    let finish: (value: string) => void = () => {
      throw new Error('Request not started');
    };
    const pending = fixture.componentInstance.view.load(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const view = fixture.componentInstance.view;
    fixture.destroy();
    finish('Late private response');
    await pending;
    expect(view.value()).toBeNull();
    expect(view.loading()).toBe(false);
  });
});
