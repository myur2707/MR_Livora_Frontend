import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
}
export function residentAccessError(error: unknown): string {
  const payload: unknown = error instanceof HttpErrorResponse ? error.error : null;
  const nested =
    typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
  const code =
    typeof nested === 'object' && nested !== null && 'code' in nested ? nested.code : null;
  switch (code) {
    case 'RESIDENT_LINK_INVALID':
      return 'This link is unavailable or expired. Existing accounts must sign in with the intended email, then reopen the invitation.';
    case 'RESIDENT_ACCESS_CONFLICT':
    case 'CONFLICT':
      return 'This record is already linked or changed. Review current membership, identity and occupancy before trying again.';
    case 'INVALID_REQUEST':
      return 'Check required fields and dates, and confirm that identity and residency were verified.';
    case 'OCCUPANCY_OVERLAP':
      return 'This person already has a matching occupancy. Select and verify the existing occupancy.';
    case 'NOT_FOUND':
    case 'ACCESS_DENIED':
      return 'This record is unavailable in your selected society.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please try again later.';
    case 'CONTEXT_CHANGED':
      return 'Your society context changed. Refresh before trying again.';
    case 'CSRF_INVALID':
      return 'Your session expired. Refresh and try again.';
    default:
      return 'Unable to complete this request. Please try again.';
  }
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
