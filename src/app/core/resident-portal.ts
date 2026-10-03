import { inject, Injectable } from '@angular/core';
import { OnboardingApi } from './onboarding';
import type { Page } from './onboarding';
export interface ResidentFlat {
  id: string;
  flatNumber: string;
  buildingCode: string;
  buildingName: string;
  areaSqFt: string | null;
  occupancies?: { type: string; startsOn: string; endsOn: string | null }[];
}
export interface ResidentBill {
  id: string;
  flatId: string;
  billNumber: string;
  buildingCode: string;
  flatNumber: string;
  periodCode: string;
  startsOn: string;
  endsOn: string;
  dueOn: string;
  issuedAt: string | null;
  gross: string;
  credits: string;
  net: string;
  paid: string;
  outstanding: string;
  settlementStatus: string;
  items?: {
    lineNumber: number;
    description: string;
    quantity: string;
    unitRate: string;
    amount: string;
  }[];
}
export interface ResidentPayment {
  id: string;
  flatId: string;
  method: string;
  paymentDate: string;
  amount: string;
  reference: string | null;
  receiptNumber: string | null;
  issuedAt: string | null;
  recordedAt: string;
  societyName: string;
  buildingCode: string;
  flatNumber: string;
  payerName: string;
  status: string;
  refunded: string;
  netAmount: string;
  allocations?: { billNumber: string; amount: string; refunded: string }[];
  refunds?: { amount: string; date: string; method: string }[];
}
export interface ResidentNotice {
  authorName?: string;
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}
export interface ResidentComplaint {
  category: string;
  id: string;
  flatId: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  buildingCode: string;
  flatNumber: string;
}
export interface ResidentDashboard {
  societyName: string;
  timezone: string;
  currentDue: string;
  overdue: string;
  recentPayment: ResidentPayment | null;
  notices: ResidentNotice[];
}
export interface ResidentProfile {
  displayName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  loginEmail: string;
  societyName: string;
  timezone: string;
}
@Injectable({ providedIn: 'root' })
export class ResidentPortalApi {
  private readonly api = inject(OnboardingApi);
  get<T>(resource: string): Promise<T> {
    return this.api.get<T>('/society/resident/' + resource);
  }
  list<T>(resource: string, page = 1, filters: Record<string, string> = {}): Promise<Page<T>> {
    return this.get<Page<T>>(
      resource +
        '?' +
        new URLSearchParams({ page: String(page), pageSize: '20', ...filters }).toString(),
    );
  }
  complain(fields: {
    category?: string;
    flatId: string;
    title: string;
    description: string;
  }): Promise<{ id: string }> {
    return this.api.post<{ id: string }>('/society/resident/complaints', fields);
  }
}
export function residentMoney(value: string): string {
  return '₹ ' + value;
}
