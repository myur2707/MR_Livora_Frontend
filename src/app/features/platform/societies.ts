import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { AbstractControl } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { OnboardingApi, onboardingError, societyStatuses } from '../../core/onboarding';
import type { Page, SocietySummary } from '../../core/onboarding';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { BadgeComponent } from '../../shared/badge';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { TableDirective } from '../../shared/table';
import { PaginationComponent } from '../../shared/pagination';
import { StateComponent } from '../../shared/state';
import { DialogComponent } from '../../shared/dialog';
import { COMMUNITY_TYPES, communityFieldText } from './community-type';
import type { CommunityType } from './community-type';
import { LabelPipe } from '../../shared/label';

const defaultSocietyTimezone = 'Asia/Kolkata';

@Component({
  selector: 'se-societies',
  imports: [
    LabelPipe,
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
    DialogComponent,
  ],
  templateUrl: './societies.html',
})
export class SocietiesComponent implements OnInit {
  private readonly api = inject(OnboardingApi);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private loadSequence = 0;
  protected readonly statuses = societyStatuses;
  protected readonly result = signal<Page<SocietySummary> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly createError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(false);
  protected readonly showCreate = signal(false);
  protected status = '';
  protected readonly searchControl = this.fb.nonNullable.control('', Validators.maxLength(80));
  protected readonly communityTypes = COMMUNITY_TYPES;
  protected readonly suggesting = signal(false);
  /** Field wording follows the chosen type ("Society code", "Enter the Flat name."). */
  protected readonly fieldText = signal(communityFieldText('SOC'));
  /** True once the admin types their own code; type changes then stop replacing it. */
  private codeEdited = false;
  private suggestion = 0;
  protected readonly form = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<CommunityType>('SOC'),
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
  });
  constructor() {
    this.searchControl.valueChanges
      .pipe(
        map((value) => value.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(() => void this.load());
  }
  ngOnInit(): void {
    void this.load();
  }
  protected async load(page = 1): Promise<void> {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.api.societies(page, this.status, this.searchControl.value.trim());
      if (sequence === this.loadSequence) this.result.set(result);
    } catch (error) {
      if (sequence === this.loadSequence) this.error.set(onboardingError(error));
    } finally {
      if (sequence === this.loadSequence) this.loading.set(false);
    }
  }
  protected filter(value: string): void {
    this.status = value;
    void this.load();
  }
  protected openCreate(): void {
    this.createError.set(null);
    this.form.reset();
    this.fieldText.set(communityFieldText(this.form.controls.type.value));
    this.codeEdited = false;
    this.showCreate.set(true);
    void this.suggestCode();
  }
  protected codeTyped(): void {
    this.codeEdited = true;
  }
  protected typeChanged(): void {
    this.fieldText.set(communityFieldText(this.form.controls.type.value));
    if (!this.codeEdited) void this.suggestCode();
  }
  /** Fills the next free code for the chosen type; a late answer for an older type is ignored. */
  protected async suggestCode(): Promise<void> {
    const sequence = ++this.suggestion;
    const type = this.form.controls.type.value;
    this.suggesting.set(true);
    try {
      const result = await this.api.get<{ code: string }>(
        '/platform/societies/next-code?type=' + type,
      );
      if (sequence === this.suggestion && !this.codeEdited)
        this.form.controls.code.setValue(result.code);
    } catch (error) {
      if (sequence === this.suggestion) this.createError.set(onboardingError(error));
    } finally {
      if (sequence === this.suggestion) this.suggesting.set(false);
    }
  }
  protected closeCreate(): void {
    if (this.busy()) return;
    this.showCreate.set(false);
    this.createError.set(null);
  }
  protected async create(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.createError.set(null);
    try {
      const { code, name } = this.form.getRawValue();
      const result = await this.api.post<{ id: string }>('/platform/societies', {
        code,
        name,
        timezone: defaultSocietyTimezone,
      });
      await this.router.navigate(['/platform/societies', result.id]);
    } catch (error) {
      if (codeTaken(error) && !this.codeEdited) {
        // Someone else took this number first; offer the next free one instead of failing.
        await this.suggestCode();
        this.createError.set(
          'That code was just used. The next free code is filled in; try again.',
        );
      } else this.createError.set(onboardingError(error));
    } finally {
      this.busy.set(false);
    }
  }
}

function codeTaken(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 409 &&
    typeof error.error === 'object' &&
    error.error !== null &&
    (error.error as { error?: { code?: unknown } }).error?.code === 'CODE_TAKEN'
  );
}
