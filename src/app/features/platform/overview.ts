import { Component, computed, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OnboardingApi, onboardingError } from '../../core/onboarding';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { FormNoticeComponent } from '../../shared/field';
import { BarListComponent, ColumnChartComponent } from '../../shared/charts';
import type { BarItem, ChartSeries } from '../../shared/charts';
import { friendlyLabel } from '../../shared/label';

/** Lifecycle and account states in the order a community or account moves through them. */
const LIFECYCLE = [
  'DRAFT',
  'SETUP_IN_PROGRESS',
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
] as const;
const ACCOUNT_STATES = ['ACTIVE', 'PENDING', 'DISABLED'] as const;
const monthName = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
function ordered(
  order: readonly string[],
  rows: readonly { status: string; total: number }[],
): BarItem[] {
  const totals = new Map(rows.map((row) => [row.status, row.total]));
  const extra = [...totals.keys()].filter((code) => !order.includes(code));
  return [...order, ...extra].map((code) => ({
    label: friendlyLabel(code),
    value: totals.get(code) ?? 0,
  }));
}
@Component({
  selector: 'se-overview',
  imports: [
    RouterLink,
    ButtonDirective,
    CardComponent,
    FormNoticeComponent,
    BarListComponent,
    ColumnChartComponent,
  ],
  templateUrl: './overview.html',
})
export class OverviewComponent implements OnInit {
  private readonly api = inject(OnboardingApi);
  protected readonly summary = signal<{ status: string; total: number }[] | null>(null);
  protected readonly error = signal<string | null>(null);
  private readonly societiesByMonth = signal<{ month: string; total: number }[]>([]);
  private readonly accounts = signal<{ status: string; total: number }[]>([]);
  protected readonly lifecycle = computed(() => ordered(LIFECYCLE, this.summary() ?? []));
  protected readonly accountStates = computed(() => ordered(ACCOUNT_STATES, this.accounts()));
  protected readonly onboarding = computed(() => {
    const months = this.societiesByMonth();
    const series: ChartSeries[] = [
      {
        name: 'New communities',
        values: months.map((m) => m.total),
        labels: months.map((m) => String(m.total)),
      },
    ];
    return {
      categories: months.map((m) => monthName.format(new Date(m.month + '-01T00:00:00Z'))),
      series,
    };
  });
  protected readonly operations = signal<{
    totalSocieties: number;
    pendingVerification: number;
    updatedAt: string | null;
  } | null>(null);
  ngOnInit(): void {
    void this.load();
  }
  protected lifecycleTotal(status: 'ACTIVE' | 'DRAFT'): number {
    return this.summary()?.find((row) => row.status === status)?.total ?? 0;
  }
  protected async load(): Promise<void> {
    this.error.set(null);
    try {
      const data = await this.api.get<{
        statuses: { status: string; total: number }[];
        totalSocieties?: number;
        pendingVerification?: number;
        updatedAt?: string;
        societiesByMonth?: { month: string; total: number }[];
        accounts?: { status: string; total: number }[];
      }>('/platform/dashboard');
      this.summary.set(data.statuses);
      this.societiesByMonth.set(data.societiesByMonth ?? []);
      this.accounts.set(data.accounts ?? []);
      this.operations.set({
        totalSocieties:
          data.totalSocieties ?? data.statuses.reduce((sum, row) => sum + row.total, 0),
        pendingVerification:
          data.pendingVerification ??
          data.statuses.find((row) => row.status === 'PENDING_VERIFICATION')?.total ??
          0,
        updatedAt: data.updatedAt ?? null,
      });
    } catch (error) {
      this.error.set(onboardingError(error));
    }
  }
}
