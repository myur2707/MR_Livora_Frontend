import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AuthState } from '../core/auth-state';
import type { SessionIdentity, SocietyAccess } from '../core/auth-state';
import { BottomNavComponent } from './bottom-nav';

const access = (roles: string[], permissions: string[]): SocietyAccess => ({
  societyId: '1',
  membershipId: '2',
  name: 'Synthetic community',
  roles,
  permissions,
});
const identity = (
  platformAdmin: boolean,
  activeSociety: SocietyAccess | null,
): SessionIdentity => ({
  userId: '3',
  email: 'synthetic@example.invalid',
  platformAdmin,
  memberships: activeSociety ? [activeSociety] : [],
  activeSociety,
  expiresAt: '2099-01-01T00:00:00Z',
});

async function tabs(session: SessionIdentity | null): Promise<string[][]> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  TestBed.inject(AuthState).identity.set(session);
  const fixture = TestBed.createComponent(BottomNavComponent);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement as HTMLElement;
  return Array.from(element.querySelectorAll('a')).map((link) => [
    link.textContent.trim(),
    link.getAttribute('href') ?? '',
  ]);
}

describe('bottom tab bar', () => {
  it('shows resident destinations only when the active membership allows them', async () => {
    expect(await tabs(identity(false, access(['RESIDENT'], ['society.dashboard.read'])))).toEqual([
      ['Home', '/society/resident/dashboard'],
      ['Notices', '/society/resident/notices'],
      ['Bills', '/society/resident/bills'],
      ['Complaints', '/society/resident/complaints'],
    ]);
  });

  it('gives platform administrators platform destinations without society data', async () => {
    expect(await tabs(identity(true, null))).toEqual([
      ['Home', '/platform/dashboard'],
      ['Societies', '/platform/societies'],
      ['Profile', '/profile'],
    ]);
  });

  it('always offers the full navigation through More', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(BottomNavComponent);
    let requests = 0;
    fixture.componentInstance.moreRequested.subscribe(() => requests++);
    await fixture.whenStable();
    const more = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(more?.getAttribute('aria-haspopup')).toBe('dialog');
    more?.click();
    expect(requests).toBe(1);
  });
});
