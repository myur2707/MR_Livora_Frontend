import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OnboardingApi, onboardingError } from '../../core/onboarding';
import type { Page, SocietySummary } from '../../core/onboarding';
import { BadgeComponent } from '../../shared/badge';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { ControlDirective, FieldComponent, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { TableDirective } from '../../shared/table';
import { eventLabel, friendlyLabel } from '../../shared/label';
import { describeStructure, structureTitle } from '../../core/setup-details';
import type { StructureDetails } from '../../core/setup-details';

export interface AuditEntry {
  id: string;
  societyId: string;
  societyName: string;
  societyCode: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorEmail: string | null;
  actorPlatform: boolean;
  createdAt: string;
  /** Setup rows only: the status change and structure facts of the matching setup event. */
  fromStatus?: string | null;
  toStatus?: string | null;
  details?: StructureDetails | null;
}
/** Entries per audit trail page. */
const auditPageSize = 5;
/** Module filter options; keys match the API's `module` values. */
export const AUDIT_MODULES = [
  { value: 'society_setup', label: 'Society setup' },
  { value: 'property', label: 'Property & residents' },
  { value: 'resident_access', label: 'Resident access' },
  { value: 'billing', label: 'Billing' },
  { value: 'payments', label: 'Payments' },
  { value: 'community', label: 'Notices & complaints' },
  { value: 'reports', label: 'Reports' },
] as const;

/** Platform Admin audit trail: who changed what, when, in every module (no private values). */
@Component({
  selector: 'se-audit-trail',
  imports: [
    DatePipe,
    FormsModule,
    BadgeComponent,
    ButtonDirective,
    CardComponent,
    ControlDirective,
    FieldComponent,
    FormNoticeComponent,
    PaginationComponent,
    TableDirective,
  ],
  templateUrl: './audit-trail.html',
})
export class AuditTrailComponent implements OnInit {
  private readonly api = inject(OnboardingApi);
  private sequence = 0;
  protected readonly modules = AUDIT_MODULES;
  protected readonly result = signal<Page<AuditEntry> | null>(null);
  protected readonly communities = signal<SocietySummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected societyId = '';
  protected module = '';
  protected from = '';
  protected to = '';
  protected search = '';

  ngOnInit(): void {
    void this.loadCommunities();
    void this.load();
  }

  protected moduleLabel(value: string): string {
    return AUDIT_MODULES.find((option) => option.value === value)?.label ?? 'Other';
  }
  protected actionLabel(entry: AuditEntry): string {
    return structureTitle(entry.details) ?? eventLabel(entry.action);
  }
  /** Readable lines saying what the entry changed; empty when only who/what/when is known. */
  protected detailLines(entry: AuditEntry): string[] {
    if (entry.details) return describeStructure(entry.details);
    if (entry.fromStatus && entry.toStatus && entry.fromStatus !== entry.toStatus)
      return ['Status: ' + friendlyLabel(entry.fromStatus) + ' → ' + friendlyLabel(entry.toStatus)];
    return [];
  }
  protected recordLabel(entry: AuditEntry): string {
    return (
      friendlyLabel(entry.entityType.toUpperCase()) + (entry.entityId ? ' #' + entry.entityId : '')
    );
  }

  protected reset(): void {
    this.societyId = '';
    this.module = '';
    this.from = '';
    this.to = '';
    this.search = '';
    void this.load();
  }

  /** Loads one page; a late answer for an older filter set is discarded. */
  protected async load(page = 1): Promise<void> {
    const current = ++this.sequence;
    if (this.from && this.to && this.from > this.to) {
      this.error.set('The "From" date must not be after the "To" date.');
      return;
    }
    const params = new URLSearchParams({ page: String(page), pageSize: String(auditPageSize) });
    for (const [key, value] of [
      ['societyId', this.societyId],
      ['module', this.module],
      ['from', this.from],
      ['to', this.to],
      ['search', this.search.trim()],
    ] as const)
      if (value) params.set(key, value);
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.api.get<Page<AuditEntry>>(
        '/platform/audit-trail?' + params.toString(),
      );
      if (current === this.sequence) this.result.set(result);
    } catch (error) {
      if (current === this.sequence) this.error.set(onboardingError(error));
    } finally {
      if (current === this.sequence) this.loading.set(false);
    }
  }

  private async loadCommunities(): Promise<void> {
    try {
      const page = await this.api.get<Page<SocietySummary>>('/platform/societies?pageSize=50');
      this.communities.set(page.items);
    } catch {
      // The community filter is optional; the trail still loads without it.
    }
  }
}
