import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';
export const societyStatuses = [
  'DRAFT',
  'SETUP_IN_PROGRESS',
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
] as const;
export type SocietyStatus = (typeof societyStatuses)[number];
export interface SocietySummary {
  id: string;
  code: string;
  name: string;
  timezone: string;
  status: SocietyStatus;
  revision: string | null;
  verifiedAt: string | null;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Flat {
  id: string;
  buildingName: string;
  buildingCode: string;
  flatNumber: string;
  areaSqFt: string | null;
}
export interface Resident {
  id: string;
  displayName: string;
  flatNumber: string;
  occupancyType: string;
  startsOn: string;
  endsOn: string | null;
}
export interface Configuration {
  id: string;
  name: string;
  method: string;
  rate: string;
  effectiveFrom: string;
}
export interface SocietyDetail extends SocietySummary {
  counts: { buildings: number; flats: number; residents: number; maintenance: number };
  requirements: {
    committee: boolean;
    buildings: boolean;
    flats: boolean;
    residents: boolean;
    maintenance: boolean;
  };
  invitation: {
    id: string;
    email: string;
    displayName: string;
    status: string;
    deliveryStatus: string;
    expiresAt: string;
  } | null;
  reviewed: boolean;
  reviewedAt: string | null;
  verifierMembershipId: string | null;
  events: {
    id: string;
    actorUserId: string;
    action: string;
    fromStatus: string | null;
    toStatus: string;
    createdAt: string;
  }[];
}
export interface InvitationPreview {
  societyName: string;
  email: string;
  displayName: string;
  expiresAt: string;
  requiresLogin: boolean;
}
export function displaySocietyTime(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
export function onboardingError(error: unknown): string {
  const payload: unknown = error instanceof HttpErrorResponse ? error.error : null;
  const nested =
    typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
  const code =
    typeof nested === 'object' && nested !== null && 'code' in nested ? nested.code : null;
  switch (code) {
    case 'REVISION_CONFLICT':
    case 'CONFLICT':
      return 'The setup changed or conflicts with existing data. Refresh and try again.';
    case 'SETUP_INCOMPLETE':
      return 'Complete all required setup sections before verification.';
    case 'REVIEW_REQUIRED':
      return 'Review the current setup before activation.';
    case 'SETUP_LOCKED':
      return 'Setup is locked in this lifecycle state.';
    case 'INVITATION_INVALID':
      return 'This invitation is unavailable or expired. Ask for a new invitation.';
    case 'INVITATION_LOGIN_REQUIRED':
      return 'Sign in with the invited account, then reopen the email invitation.';
    case 'COMMITTEE_ALREADY_ASSIGNED':
      return 'The initial committee administrator is already assigned.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please try again later.';
    case 'INVALID_REQUEST':
      return 'Check the form fields and try again.';
    case 'INVALID_TRANSITION':
      return 'This lifecycle transition is not allowed.';
    case 'COMMITTEE_VERIFICATION_REQUIRED':
      return 'The committee must verify and activate this society.';
    case 'NOT_FOUND':
    case 'ACCESS_DENIED':
      return 'This society is unavailable to your account.';
    default:
      return 'Unable to complete your request. Please try again.';
  }
}
@Injectable({ providedIn: 'root' })
export class OnboardingApi {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  async get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>('/api/v1' + path));
  }
  async post<T = void>(path: string, body: unknown): Promise<T> {
    await this.auth.prepare();
    return firstValueFrom(this.http.post<T>('/api/v1' + path, body));
  }
  async societies(page = 1, status = ''): Promise<Page<SocietySummary>> {
    let params = new HttpParams().set('page', page).set('pageSize', 20);
    if (status) params = params.set('status', status);
    return firstValueFrom(
      this.http.get<Page<SocietySummary>>('/api/v1/platform/societies', { params }),
    );
  }
}
