import { apiErrorMessage } from './api-error';
import { Injectable, inject } from '@angular/core';
import { OnboardingApi } from './onboarding';
export interface ResidentInvitation {
  id: string;
  personId: string;
  flatId: string;
  displayName: string;
  email: string;
  status: string;
  deliveryStatus: string;
  expiresAt: string;
}
export interface ResidentInvitationPreview {
  societyName: string;
  displayName: string;
  email: string;
  expiresAt: string;
  action: 'RESIDENT_JOIN';
}
export interface RegistrationRequest {
  id: string;
  societyName: string;
  displayName: string;
  email: string;
  contactPhone: string | null;
  note: string | null;
  flatId: string;
  buildingCode: string;
  flatNumber: string;
  occupancyType: string;
  status: string;
  decisionNote: string | null;
  reviewedAt: string | null;
  resolvedPersonId: string | null;
  membershipId: string | null;
  occupancyId: string | null;
  /** The committee's published contact; only present on the applicant's own pending requests. */
  committeeContact?: SocietyContact | null;
  /** Committee view only: set when a pending applicant already belongs to this society. */
  existingMember?: ExistingMember | null;
}
/** An applicant's current membership and homes in the reviewing committee's society. */
export interface ExistingMember {
  status: string;
  homes: {
    buildingCode: string;
    buildingName: string;
    flatNumber: string;
    occupancyType: string;
    startsOn: string;
    endsOn: string | null;
    /** Whether the occupancy is in effect on the society's current date. */
    state: 'CURRENT' | 'ENDED' | 'UPCOMING';
  }[];
}
/** Contact a committee publishes for applicants whose requests await review. */
export interface SocietyContact {
  contactPhone: string | null;
  contactEmail: string | null;
}
const residentAccessErrorMessages: Readonly<Record<string, string>> = {
  RESIDENT_LINK_INVALID:
    'This link is unavailable or expired. Existing accounts must sign in with the intended email, then reopen the invitation.',
  RESIDENT_ACCESS_CONFLICT:
    'This record is already linked or changed. Review current membership, identity and occupancy before trying again.',
  RESIDENT_HOME_ALREADY_LINKED:
    'You already have access to this home. Choose a different flat or row house.',
  RESIDENT_REQUEST_PENDING:
    'You already have a pending request in this community. Wait for the committee to review it, or cancel it to request a different home.',
  CONFLICT:
    'This record is already linked or changed. Review current membership, identity and occupancy before trying again.',
  INVALID_REQUEST:
    'Check required fields and dates, and confirm that identity and residency were verified.',
  OCCUPANCY_OVERLAP:
    'This person already has a matching occupancy. Select and verify the existing occupancy.',
  NOT_FOUND: 'This record is unavailable in your selected society.',
  ACCESS_DENIED: 'This record is unavailable in your selected society.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  CONTEXT_CHANGED: 'Your society context changed. Refresh before trying again.',
  CSRF_INVALID: 'Your session expired. Refresh and try again.',
};
export function residentAccessError(error: unknown): string {
  return (
    apiErrorMessage(error, residentAccessErrorMessages) ??
    'Unable to complete this request. Please try again.'
  );
}
@Injectable({ providedIn: 'root' })
export class ResidentAccessApi {
  private readonly api = inject(OnboardingApi);
  get<T>(path: string): Promise<T> {
    return this.api.get<T>(path);
  }
  post<T = void>(path: string, body: unknown): Promise<T> {
    return this.api.post<T>(path, body);
  }
}
