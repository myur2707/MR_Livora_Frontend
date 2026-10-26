import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthState } from '../../core/auth-state';
import { ReportsApi } from '../../core/reports';
import type { CommitteeSummary } from '../../core/reports';
import { COMPLAINT_STATUSES } from '../../core/community';
import { residentMoney } from '../../core/resident-portal';
import { ResidentView as PrivateView } from '../resident-portal/view';
import { CardComponent } from '../../shared/card';
import { FormNoticeComponent } from '../../shared/field';
import { BarListComponent, ColumnChartComponent } from '../../shared/charts';
import { friendlyLabel } from '../../shared/label';
import type { BarItem, ChartSeries } from '../../shared/charts';

/** Bill states in the order a bill moves through them, so the chart reads as a pipeline. */
const BILL_STATES = ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE', 'SETTLED', 'DRAFT'] as const;
const monthName = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Fixed-order counts: every known state is shown (zeros included) so charts stay comparable. */
function ordered(
  order: readonly string[],
  rows: readonly { code: string; total: number }[],
): BarItem[] {
  const totals = new Map(rows.map((row) => [row.code, row.total]));
  const extra = [...totals.keys()].filter((code) => !order.includes(code));
  return [...order, ...extra].map((code) => ({
    label: friendlyLabel(code),
    value: totals.get(code) ?? 0,
  }));
}

function statusRows(rows: readonly { status: string; total: number }[] = []) {
  return rows.map((row) => ({ code: row.status, total: row.total }));
}

@Component({
  selector: 'se-committee-dashboard',
  imports: [
    DatePipe,
    RouterLink,
    CardComponent,
    FormNoticeComponent,
    BarListComponent,
    ColumnChartComponent,
  ],
  templateUrl: './dashboard.html',
})
export class CommitteeDashboardPage {
  protected readonly auth = inject(AuthState);
  private readonly api = inject(ReportsApi);
  protected readonly summary = new PrivateView<CommitteeSummary>();
  protected readonly money = residentMoney;
  private readonly permissions = computed(
    () => this.auth.identity()?.activeSociety?.permissions ?? [],
  );
  /** Occupancy, complaint and notice views are for committee roles; accountants see finance only. */
  protected readonly community = computed(() =>
    this.permissions().some(
      (p) => p === 'society.complaints.manage' || p === 'society.members.manage',
    ),
  );
  /** Report totals and report links need finance.read; chart aggregates are shared with the committee. */
  protected readonly financeReader = computed(() =>
    this.permissions().includes('society.finance.read'),
  );
  protected readonly occupancy = computed(() => {
    const data = this.summary.value();
    if (!data) return null;
    const occupied = Math.min(data.occupancy.occupiedFlats, data.flats);
    return {
      occupied,
      vacant: Math.max(0, data.flats - occupied),
      percent: data.flats ? Math.round((occupied / data.flats) * 100) : 0,
      types: ordered(
        ['OWNER', 'TENANT'],
        data.occupancy.types.map((row) => ({ code: row.type, total: row.total })),
      ),
    };
  });
  protected readonly complaints = computed(() =>
    ordered(COMPLAINT_STATUSES, statusRows(this.summary.value()?.complaintStatuses)),
  );
  protected readonly bills = computed(() =>
    ordered(BILL_STATES, statusRows(this.summary.value()?.trends?.billingStatuses)),
  );
  protected readonly periods = computed(() => {
    const periods = this.summary.value()?.trends?.periods ?? [];
    const series: ChartSeries[] = [
      {
        name: 'Collected',
        values: periods.map((p) => Number(p.collected)),
        labels: periods.map((p) => residentMoney(p.collected)),
      },
      {
        name: 'Outstanding',
        values: periods.map((p) => Number(p.outstanding)),
        labels: periods.map((p) => residentMoney(p.outstanding)),
      },
    ];
    return { categories: periods.map((p) => p.periodCode), series };
  });
  protected readonly monthly = computed(() => {
    const months = this.summary.value()?.trends?.monthlyCollections ?? [];
    const series: ChartSeries[] = [
      {
        name: 'Net collections',
        values: months.map((m) => Number(m.netRecorded)),
        labels: months.map((m) => residentMoney(m.netRecorded)),
      },
    ];
    return {
      categories: months.map((m) => monthName.format(new Date(m.month + '-01T00:00:00Z'))),
      series,
    };
  });
  constructor() {
    void this.summary.load(() => this.api.dashboard());
  }
}
