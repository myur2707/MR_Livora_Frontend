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

async function render(session: SessionIdentity | null): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  TestBed.inject(AuthState).identity.set(session);
  const fixture = TestBed.createComponent(BottomNavComponent);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const tabsOf = (element: HTMLElement): string[][] =>
  Array.from(element.querySelectorAll('a')).map((link) => [
    link.textContent.trim(),
    link.getAttribute('href') ?? '',
  ]);

describe('bottom tab bar', () => {
  it('lists every permitted destination except the UI library, with compact labels', async () => {
    const element = await render(identity(true, null));
    expect(tabsOf(element)).toEqual([
      ['Overview', '/platform/dashboard'],
      ['Societies', '/platform/societies'],
      ['Requests', '/join-society'],
      ['Profile', '/profile'],
    ]);
    expect(element.querySelector('button')).toBeNull();
    expect(element.querySelector('nav')?.classList.contains('is-scrollable')).toBe(false);
  });

  it('shows resident destinations only when the active membership allows them', async () => {
    const element = await render(identity(false, access(['RESIDENT'], ['society.dashboard.read'])));
    expect(tabsOf(element)).toEqual([
      ['Home', '/society/resident/dashboard'],
      ['My Flats', '/society/resident/flats'],
      ['My Bills', '/society/resident/bills'],
      ['Payments', '/society/resident/payments'],
      ['Receipts', '/society/resident/receipts'],
      ['Notices', '/society/resident/notices'],
      ['Complaints', '/society/resident/complaints'],
      ['Workspace', '/workspace'],
      ['Community', '/society/dashboard'],
      ['Requests', '/join-society'],
      ['Profile', '/profile'],
    ]);
    expect(tabsOf(element).some(([, href = '']) => href.startsWith('/society/billing'))).toBe(
      false,
    );
    expect(element.querySelector('nav')?.classList.contains('is-scrollable')).toBe(true);
  });
});
