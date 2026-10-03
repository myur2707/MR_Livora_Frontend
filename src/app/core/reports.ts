import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OnboardingApi } from './onboarding';
import { billingError } from './billing';
export const REPORT_KINDS = [
  'outstanding',
  'collection',
  'cash-collection',
  'payments',
  'residents',
  'flat-occupancy',
  'billing',
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export const REPORT_LABELS: Record<ReportKind, string> = {
  outstanding: 'Outstanding',
  collection: 'Collections',
  'cash-collection': 'Cash collection',
  payments: 'Payments',
  residents: 'Residents',
  'flat-occupancy': 'Flat occupancy',
  billing: 'Billing',
};
export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'money' | 'date';
}
export interface SocietyReport {
  kind: ReportKind;
  columns: ReportColumn[];
  items: Record<string, string | number | null>[];
  total: number;
  page: number;
  pageSize: number;
  summary: Record<string, string>;
  timezone: string;
  asOf: string;
  range: { from: string | null; to: string | null };
}
export interface CommitteeSummary {
  timezone: string;
  asOf: string;
  flats: number;
  occupancy: {
    occupiedFlats: number;
    occupancies: number;
    persons: number;
    types: { type: string; total: number }[];
  };
  pendingComplaints: number;
  recentNotices: { id: string; title: string; publishedAt: string }[];
  finance: {
    billing: Record<string, string>;
    billingStatuses: { status: string; total: number }[];
    collections: Record<string, string>;
    cash: Record<string, string>;
    from: string;
    to: string;
  } | null;
}
@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly api = inject(OnboardingApi);
  private readonly http = inject(HttpClient);
  dashboard(): Promise<CommitteeSummary> {
    return this.api.get<CommitteeSummary>('/society/dashboard');
  }
  list(kind: ReportKind, page = 1, filters: Record<string, string> = {}): Promise<SocietyReport> {
    return this.api.get<SocietyReport>(
      '/society/reports/' +
        kind +
        '?' +
        new URLSearchParams({ page: String(page), pageSize: '20', ...filters }).toString(),
    );
  }
  export(kind: ReportKind, filters: Record<string, string>): Promise<string> {
    return firstValueFrom(
      this.http.get(
        '/api/v1/society/reports/' + kind + '/export?' + new URLSearchParams(filters).toString(),
        { responseType: 'text' },
      ),
    );
  }
}
export function reportError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 422)
    return 'Narrow the filters to export at most 5000 records.';
  if (error instanceof HttpErrorResponse && error.status === 400)
    return 'Check the date range and report filters. Use both dates, covering at most 366 days.';
  return billingError(error);
}
export const reportFinancial = (kind: ReportKind) =>
  kind !== 'residents' && kind !== 'flat-occupancy';
