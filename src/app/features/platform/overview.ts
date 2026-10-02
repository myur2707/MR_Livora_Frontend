import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OnboardingApi, onboardingError } from '../../core/onboarding';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { FormNoticeComponent } from '../../shared/field';
import { StateComponent } from '../../shared/state';
@Component({
  selector: 'se-overview',
  imports: [RouterLink, ButtonDirective, CardComponent, FormNoticeComponent, StateComponent],
  templateUrl: './overview.html',
})
export class OverviewComponent implements OnInit {
  private readonly api = inject(OnboardingApi);
  protected readonly summary = signal<{ status: string; total: number }[] | null>(null);
  protected readonly error = signal<string | null>(null);
  ngOnInit(): void {
    void this.load();
  }
  protected async load(): Promise<void> {
    this.error.set(null);
    try {
      this.summary.set(
        (
          await this.api.get<{ statuses: { status: string; total: number }[] }>(
            '/platform/dashboard',
          )
        ).statuses,
      );
    } catch (error) {
      this.error.set(onboardingError(error));
    }
  }
}
