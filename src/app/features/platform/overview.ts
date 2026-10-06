import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OnboardingApi, onboardingError } from '../../core/onboarding';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { FormNoticeComponent } from '../../shared/field';
@Component({
  selector: 'se-overview',
  imports: [RouterLink, ButtonDirective, CardComponent, FormNoticeComponent],
  templateUrl: './overview.html',
})
export class OverviewComponent implements OnInit {
  private readonly api = inject(OnboardingApi);
  protected readonly summary = signal<{ status: string; total: number }[] | null>(null);
  protected readonly error = signal<string | null>(null);
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
      }>('/platform/dashboard');
      this.summary.set(data.statuses);
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
