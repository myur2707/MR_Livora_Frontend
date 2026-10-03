import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ReportsApi,
  REPORT_KINDS,
  REPORT_LABELS,
  reportFinancial,
  reportError,
} from '../../core/reports';
import type { ReportKind, SocietyReport } from '../../core/reports';
import { AuthState } from '../../core/auth-state';
import { ResidentView as PrivateView } from '../resident-portal/view';
import { BillingPicker } from '../billing/picker';
import { ResourcePicker } from '../property/picker';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { TableDirective } from '../../shared/table';
import { CardComponent } from '../../shared/card';
import { occupancyTypes } from '../../core/property';
import { PAYMENT_METHODS } from '../../core/payments';
@Component({
  selector: 'se-society-reports',
  imports: [
    FormsModule,
    RouterLink,
    BillingPicker,
    ResourcePicker,
    ButtonDirective,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    PaginationComponent,
    TableDirective,
    CardComponent,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class SocietyReportsPage {
  protected readonly auth = inject(AuthState);
  private readonly api = inject(ReportsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  protected readonly report = new PrivateView<SocietyReport>();
  protected readonly error = signal<string | null>(null);
  protected readonly exporting = signal(false);
  protected readonly advanced = signal(false);
  protected readonly attempted = signal(false);
  protected readonly labels = REPORT_LABELS;
  protected readonly financial = reportFinancial;
  protected readonly methods = PAYMENT_METHODS;
  protected readonly occupancyTypes = occupancyTypes;
  protected kind: ReportKind = 'outstanding';
  protected from = '';
  protected to = '';
  protected q = '';
  protected status = 'ALL';
  protected sort = 'date';
  protected direction = 'DESC';
  protected method = '';
  protected occupancyType = '';
  protected buildingId = '';
  protected flatId = '';
  protected periodId = '';
  protected collectorUserId = '';
  private alive = true;
  constructor() {
    const destroy = inject(DestroyRef);
    destroy.onDestroy(() => {
      this.alive = false;
    });
    this.route.paramMap.pipe(takeUntilDestroyed(destroy)).subscribe((params) => {
      const kind = REPORT_KINDS.find((value) => value === params.get('kind'));
      if (kind) {
        this.kind = kind;
        this.reset();
      }
    });
  }
  protected choices(): ReportKind[] {
    return REPORT_KINDS.filter((kind) =>
      this.auth
        .identity()
        ?.activeSociety?.permissions.includes(
          reportFinancial(kind) ? 'society.finance.read' : 'society.members.manage',
        ),
    );
  }
  protected statusChoices(): string[] {
    if (this.kind === 'residents') return ['ALL', 'ACTIVE', 'ARCHIVED'];
    if (this.kind === 'flat-occupancy') return ['ALL', 'CURRENT', 'ENDED', 'FUTURE', 'ARCHIVED'];
    if (this.kind === 'billing' || this.kind === 'outstanding')
      return [
        'ALL',
        'DRAFT',
        'ISSUED',
        'OUTSTANDING',
        'SETTLED',
        'OVERDUE',
        'UNPAID',
        'PARTIALLY_PAID',
      ];
    if (this.kind === 'payments')
      return ['ALL', 'RECORDED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REVERSED'];
    return ['ALL'];
  }
  protected sortChoices(): string[] {
    return this.kind === 'residents' || this.kind === 'flat-occupancy'
      ? ['date', 'id', 'name']
      : this.kind === 'billing' || this.kind === 'outstanding'
        ? ['date', 'id', 'amount', 'outstanding']
        : ['date', 'id', 'amount'];
  }
  protected dateError(): string | null {
    if (!this.attempted()) return null;
    if (!!this.from !== !!this.to) return 'Choose both dates or leave both blank.';
    if (this.from && this.to) {
      const start = Date.parse(this.from),
        end = Date.parse(this.to);
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        this.to < this.from ||
        end - start > 365 * 86400000 ||
        this.from < '2000-01-01' ||
        this.to > '2100-12-31'
      )
        return 'Choose a valid range of at most 366 days, between 2000 and 2100.';
    }
    return null;
  }
  private filters(): Record<string, string> {
    const fields = {
      from: this.from,
      to: this.to,
      q: this.q,
      status: this.status,
      sort: this.sort,
      direction: this.direction,
      method: this.method,
      occupancyType: this.occupancyType,
      buildingId: this.buildingId,
      flatId: this.flatId,
      periodId: this.periodId,
      collectorUserId: this.collectorUserId,
    };
    return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== ''));
  }
  protected async load(page = 1): Promise<void> {
    this.attempted.set(true);
    if (this.dateError()) return;
    this.error.set(null);
    await this.report.load(() => this.api.list(this.kind, page, this.filters()));
  }
  protected reset(): void {
    this.from = '';
    this.to = '';
    this.q = '';
    this.status = 'ALL';
    this.sort = 'date';
    this.direction = 'DESC';
    this.method = '';
    this.occupancyType = '';
    this.buildingId = '';
    this.flatId = '';
    this.periodId = '';
    this.collectorUserId = '';
    this.advanced.set(false);
    this.attempted.set(false);
    void this.load();
  }
  protected summaryLabel(key: string): string {
    return (
      (
        {
          billed: 'Issued bill total',
          credits: 'Credits',
          paid: 'Paid after returns',
          outstanding: 'Current outstanding',
          creditBalance: 'Credit balance',
          totalRecorded: 'Original payments',
          collections: 'Collections',
          refunds: 'Refunds',
          reversals: 'Reversals',
          netRecorded: this.kind === 'payments' ? 'Current net payments' : 'Net recorded',
        } as Record<string, string>
      )[key] ?? key
    );
  }
  protected summaryEntries(summary: Record<string, string>): [string, string][] {
    return Object.entries(summary);
  }
  private key(): string {
    const identity = this.auth.identity();
    return (identity?.userId ?? '') + ':' + (identity?.activeSociety?.societyId ?? '');
  }
  protected async exportCsv(): Promise<void> {
    if (this.exporting()) return;
    this.attempted.set(true);
    if (this.dateError()) return;
    const key = this.key(),
      kind = this.kind;
    this.exporting.set(true);
    this.error.set(null);
    try {
      const text = await this.api.export(kind, this.filters());
      if (
        !this.alive ||
        this.key() !== key ||
        kind !== this.kind ||
        !this.auth.identity()?.activeSociety?.permissions.includes('society.reports.export') ||
        !this.choices().includes(kind)
      )
        return;
      // Fetch text decoding may consume the response BOM; keep the downloaded UTF-8 artifact explicit.
      const csv = text.startsWith('\uFEFF') ? text : '\uFEFF' + text;
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      try {
        const anchor = this.document.createElement('a');
        anchor.href = url;
        anchor.download = 'livora-' + kind + '.csv';
        anchor.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (this.alive && key === this.key()) this.error.set(reportError(error));
    } finally {
      if (this.alive) this.exporting.set(false);
    }
  }
}
