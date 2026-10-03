import { inject, Injectable } from '@angular/core';
import { OnboardingApi } from './onboarding';
import type { Page } from './onboarding';
export const COMPLAINT_CATEGORIES = [
  'MAINTENANCE',
  'PLUMBING',
  'ELECTRICAL',
  'SECURITY',
  'COMMON_AREA',
  'OTHER',
] as const;
export const COMPLAINT_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export interface CommunityNotice {
  authorName: string;
  id: string;
  title: string;
  body: string;
  status: string;
  authorMembershipId: string;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string | null;
  revision: number;
}
export interface ComplaintHistory {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string;
  revision: number;
  createdAt: string;
}
export interface CommitteeComplaint {
  id: string;
  flatId: string;
  title: string;
  description: string;
  status: string;
  category: string;
  revision: number;
  assigneeMembershipId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  flatNumber: string;
  buildingCode: string;
}
export interface ComplaintAssignee {
  id: string;
  displayName: string;
}
@Injectable({ providedIn: 'root' })
export class CommunityApi {
  private readonly api = inject(OnboardingApi);
  get<T>(path: string): Promise<T> {
    return this.api.get<T>('/society/community/' + path);
  }
  list<T>(path: string, page = 1, filters: Record<string, string> = {}): Promise<Page<T>> {
    return this.get<Page<T>>(
      path +
        '?' +
        new URLSearchParams({ page: String(page), pageSize: '20', ...filters }).toString(),
    );
  }
  post<T>(path: string, body: object): Promise<T> {
    return this.api.post<T>('/society/community/' + path, body);
  }
}
export function complaintNext(status: string): string | null {
  return (
    (
      {
        NEW: 'ASSIGNED',
        ASSIGNED: 'IN_PROGRESS',
        IN_PROGRESS: 'RESOLVED',
        RESOLVED: 'CLOSED',
      } as Record<string, string>
    )[status] ?? null
  );
}
