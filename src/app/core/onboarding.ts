import { apiErrorDetail, apiErrorMessage } from './api-error';
import type { StructureDetails } from './setup-details';
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  personId: string;
  flatId: string;
  displayName: string;
  buildingCode: string;
  buildingName: string;
  flatNumber: string;
  occupancyType: string;
  startsOn: string;
  endsOn: string | null;
}
export interface Configuration {
  id: string;
  chargeTypeId: string;
  code: string;
  name: string;
  method: string;
  rate: string;
  effectiveFrom: string;
}
export interface SocietyDetail extends SocietySummary {
  /** Display counts: buildings are real wings and flats exclude row houses. */
  counts: {
    buildings: number;
    flats: number;
    rowHouses: number;
    residents: number;
    maintenance: number;
  };
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
    /** Audit trail: who acted and, for committee invitations, whom they invited. */
    actorName?: string | null;
    actorEmail?: string | null;
    invitedName?: string | null;
    invitedEmail?: string | null;
    invitationStatus?: string | null;
    /** Structure facts for wing, flat and row house saves; null for other events. */
    details?: StructureDetails | null;
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
const onboardingErrorMessages: Readonly<Record<string, string>> = {
  CODE_TAKEN: 'This code is already in use. Choose another code.',
  REVISION_CONFLICT: 'The setup changed or conflicts with existing data. Refresh and try again.',
  CONFLICT: 'The setup changed or conflicts with existing data. Refresh and try again.',
  SETUP_INCOMPLETE: 'Complete all required setup sections before verification.',
  REVIEW_REQUIRED: 'Review the current setup before activation.',
  SETUP_LOCKED: 'Setup is locked in this lifecycle state.',
  INVITATION_INVALID: 'This invitation is unavailable or expired. Ask for a new invitation.',
  INVITATION_LOGIN_REQUIRED: 'Sign in with the invited account, then reopen the email invitation.',
  COMMITTEE_ALREADY_ASSIGNED: 'The initial committee administrator is already assigned.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  INVALID_REQUEST: 'Check the form fields and try again.',
  INVALID_TRANSITION: 'This lifecycle transition is not allowed.',
  COMMITTEE_VERIFICATION_REQUIRED: 'The committee must verify and activate this society.',
  NOT_FOUND: 'This society is unavailable to your account.',
  ACCESS_DENIED: 'This society is unavailable to your account.',
  RECORD_HAS_DEPENDENCIES:
    'This record has later resident, access, billing, payment, or invitation activity, so it cannot be edited or archived.',
};
/** These conflicts name the caller's own wing code or the numbers that already exist. */
const detailedConflicts: ReadonlySet<string> = new Set(['NOTHING_TO_ADD', 'WING_ARCHIVED']);
/** What a save added, and which entered numbers were skipped because they already exist. */
export interface AddedNumbers {
  added: string[];
  skipped: string[];
}
export interface WingResult extends AddedNumbers {
  code: string;
  existing: boolean;
}
export function onboardingError(error: unknown): string {
  return (
    apiErrorDetail(error, detailedConflicts) ??
    apiErrorMessage(error, onboardingErrorMessages) ??
    'Unable to complete your request. Please try again.'
  );
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
  async put<T = void>(path: string, body: unknown): Promise<T> {
    await this.auth.prepare();
    return firstValueFrom(this.http.put<T>('/api/v1' + path, body));
  }
  async societies(page = 1, status = '', search = '', type = ''): Promise<Page<SocietySummary>> {
    let params = new HttpParams().set('page', page).set('pageSize', 5);
    if (status) params = params.set('status', status);
    if (type) params = params.set('type', type);
    if (search) params = params.set('search', search);
    return firstValueFrom(
      this.http.get<Page<SocietySummary>>('/api/v1/platform/societies', { params }),
    );
  }
}
