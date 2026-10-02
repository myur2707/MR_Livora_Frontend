import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import type { AbstractControl } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OnboardingApi, onboardingError, societyStatuses } from '../../core/onboarding';
import type { Page, SocietySummary } from '../../core/onboarding';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { BadgeComponent } from '../../shared/badge';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { TableDirective } from '../../shared/table';
import { PaginationComponent } from '../../shared/pagination';
import { StateComponent } from '../../shared/state';
@Component({
  selector: 'se-societies',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonDirective,
    CardComponent,
    BadgeComponent,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    TableDirective,
    PaginationComponent,
    StateComponent,
  ],
  templateUrl: './societies.html',
})
export class SocietiesComponent implements OnInit {
  private readonly api = inject(OnboardingApi);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  protected readonly statuses = societyStatuses;
  protected readonly result = signal<Page<SocietySummary> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(false);
  protected readonly showCreate = signal(false);
  protected status = '';
  protected readonly form = this.fb.nonNullable.group({
    code: [
      '',
      [
        (control: AbstractControl) => Validators.required(control),
        Validators.pattern(/^[A-Z][A-Z0-9_-]{2,63}$/),
      ],
    ],
    name: [
      '',
      [(control: AbstractControl) => Validators.required(control), Validators.maxLength(200)],
    ],
    timezone: ['Asia/Kolkata', [(control: AbstractControl) => Validators.required(control)]],
  });
  ngOnInit(): void {
    void this.load();
  }
  protected async load(page = 1): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.result.set(await this.api.societies(page, this.status));
    } catch (error) {
      this.error.set(onboardingError(error));
    } finally {
      this.loading.set(false);
    }
  }
  protected filter(value: string): void {
    this.status = value;
    void this.load();
  }
  protected async create(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.api.post<{ id: string }>(
        '/platform/societies',
        this.form.getRawValue(),
      );
      await this.router.navigate(['/platform/societies', result.id]);
    } catch (error) {
      this.error.set(onboardingError(error));
    } finally {
      this.busy.set(false);
    }
  }
}
