import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { OnboardingApi } from './onboarding';
import type { Page } from './onboarding';
export interface BillingChoice {
  id: string;
  code?: string;
  name?: string;
  frequency?: string;
  buildingId?: string;
  buildingCode?: string;
  flatNumber?: string;
  areaSqFt?: string | null;
  kind?: string;
  startsOn?: string;
  endsOn?: string;
  dueOn?: string;
}
export interface ChargeConfiguration {
  id: string;
  chargeTypeId: string;
  chargeName: string;
  scope: string;
  buildingId: string | null;
  flatId: string | null;
  buildingCode: string | null;
  flatNumber: string | null;
  calculationMethod: string;
  rate: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  version: number;
  eligibility: string;
  enabled: number;
}
export interface Discount {
  flatId: string;
  kind: 'FIXED' | 'PERCENT';
  value: string;
  reason: string;
}
export interface BillingRequest {
  periodId: string;
  flatIds: string[];
  discounts: Discount[];
}
export interface BillItem {
  description: string;
  quantity: string;
  unitRate: string;
  amount: string;
  configurationId: string;
}
export interface PreviewFlat {
  flatId: string;
  buildingCode: string;
  flatNumber: string;
  status: string;
  existingBillId: string | null;
  items: BillItem[];
  exclusions: string[];
  gross: string;
  discount: string;
  net: string;
  previousOutstanding: string;
}
export interface BillingPreview {
  period: BillingChoice;
  flats: PreviewFlat[];
  gross: string;
  discount: string;
  net: string;
  previewHash: string;
}
export interface Bill {
  id: string;
  billNumber: string;
  flatId: string;
  buildingCode: string;
  flatNumber: string;
  periodCode: string;
  startsOn: string;
  endsOn: string;
  dueOn: string;
  status: string;
  gross: string;
  credits: string;
  net: string;
  paid: string;
  outstanding: string;
  creditBalance: string;
  settlementStatus: string;
  previousOutstanding: string | null;
  items: BillItem[];
  adjustments: {
    id: string;
    direction: string;
    amount: string;
    reason: string;
    kind: string | null;
    value: string | null;
  }[];
}
export type BillPage = Page<Bill> & { summary: { outstanding: string; creditBalance: string } };
export function choiceLabel(choice: BillingChoice): string {
  return choice.flatNumber
    ? choice.buildingCode + ' / ' + choice.flatNumber
    : (choice.code ? choice.code + ' · ' : '') + (choice.name ?? choice.kind ?? '');
}
export function billingError(error: unknown): string {
  const payload: unknown = error instanceof HttpErrorResponse ? error.error : null;
  const nested =
    typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
  const code =
    typeof nested === 'object' && nested !== null && 'code' in nested ? nested.code : null;
  switch (code) {
    case 'PREVIEW_CHANGED':
      return 'Billing data changed. Review a new preview before issuing bills.';
    case 'NO_NEW_BILLS':
      return 'No new charges are available for the selected flats.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'This request was already used. Refresh and review the bill list.';
    case 'MISSING_AREA':
      return 'A selected flat needs a positive area for its per-square-foot charge.';
    case 'INVALID_DISCOUNT':
      return 'Enter a positive discount within the bill amount; percentages must be at most 100.';
    case 'AMOUNT_LIMIT':
    case 'BILLING_LIMIT':
      return 'The billing limit was exceeded. Review amounts or use a smaller batch.';
    case 'INVALID_REQUEST':
    case 'INVALID_AMOUNT':
      return 'Check required fields, dates and amounts (at most two decimal places).';
    case 'CONFLICT':
      return 'A matching code, version or bill already exists. Refresh and review current records.';
    case 'NOT_FOUND':
    case 'ACCESS_DENIED':
      return 'This record is unavailable in your selected society.';
    case 'CONTEXT_CHANGED':
      return 'Your society changed. Refresh before continuing.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please try again later.';
    case 'CSRF_INVALID':
    case 'AUTH_REQUIRED':
      return 'Your session expired. Sign in again.';
    default:
      return 'Unable to complete this request. Check your connection and try again.';
  }
}
@Injectable({ providedIn: 'root' })
export class BillingApi {
  private readonly api = inject(OnboardingApi);
  list<T>(
    resource: string,
    page = 1,
    q = '',
    filters: Record<string, string> = {},
  ): Promise<Page<T>> {
    const query = new URLSearchParams({ page: String(page), pageSize: '20', q, ...filters });
    return this.api.get<Page<T>>('/society/billing/' + resource + '?' + query.toString());
  }
  get<T>(resource: string): Promise<T> {
    return this.api.get<T>('/society/billing/' + resource);
  }
  post<T>(resource: string, body: unknown): Promise<T> {
    return this.api.post<T>('/society/billing/' + resource, body);
  }
}
