import { Injectable, signal } from '@angular/core';

export interface SocietyAccess {
  societyId: string;
  membershipId: string;
  name: string;
  roles: string[];
  permissions: string[];
}
export interface SessionIdentity {
  userId: string;
  email: string;
  platformAdmin: boolean;
  memberships: SocietyAccess[];
  activeSociety: SocietyAccess | null;
  expiresAt: string;
  setupSocieties?: { societyId: string; name: string; status: string }[];
}
@Injectable({ providedIn: 'root' })
export class AuthState {
  readonly identity = signal<SessionIdentity | null>(null);
  readonly csrf = signal<string | null>(null);
  clear(): void {
    this.identity.set(null);
    this.csrf.set(null);
  }
}
