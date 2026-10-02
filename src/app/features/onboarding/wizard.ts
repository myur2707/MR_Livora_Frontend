import { Component, computed, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { AbstractControl } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { displaySocietyTime } from '../../core/onboarding';
import { AuthService } from '../../core/auth';
import { OnboardingApi, onboardingError } from '../../core/onboarding';
import type {
  SocietyDetail,
  Flat,
  Resident,
  Configuration,
  Page,
  SocietyStatus,
} from '../../core/onboarding';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { BadgeComponent } from '../../shared/badge';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { StateComponent } from '../../shared/state';
import { TableDirective } from '../../shared/table';
import { PaginationComponent } from '../../shared/pagination';
import { DialogComponent } from '../../shared/dialog';
@Component({
  selector: 'se-onboarding-wizard',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonDirective,
    CardComponent,
    BadgeComponent,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    StateComponent,
    TableDirective,
    PaginationComponent,
    DialogComponent,
  ],
  templateUrl: './wizard.html',
})
export class OnboardingWizardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(OnboardingApi);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  protected readonly displayTime = displaySocietyTime;
  protected readonly platform = this.route.snapshot.data['scope'] === 'platform';
  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly prefix =
    (this.platform ? '/platform' : '/onboarding') + '/societies/' + this.id;
  protected readonly detail = signal<SocietyDetail | null>(null);
  protected readonly flats = signal<Flat[]>([]);
  protected readonly structure = signal<Page<Flat> | null>(null);
  protected readonly chargesPage = signal<Page<Configuration> | null>(null);
  protected readonly residents = signal<Page<Resident> | null>(null);
  protected readonly configurations = signal<Configuration[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(true);
  protected readonly step = signal(0);
  protected readonly steps = [
    'Society',
    'Committee Admin',
    'Buildings/Flats',
    'Residents',
    'Maintenance',
    'Verification',
    'Activate',
  ];
  protected readonly residentsAttested = signal(false);
  protected readonly maintenanceAttested = signal(false);
  protected readonly reviewAttested = signal(false);
  protected readonly activationDialog = signal(false);
  protected readonly pendingStatus = signal<SocietyStatus | null>(null);
  protected readonly editable = computed(() => this.detail()?.status === 'SETUP_IN_PROGRESS');
  protected readonly complete = computed(() => {
    const detail = this.detail();
    return !!detail && Object.values(detail.requirements).every(Boolean);
  });
  protected readonly inviteForm = this.fb.nonNullable.group({
    email: [
      '',
      [
        (control: AbstractControl) => Validators.required(control),
        (control: AbstractControl) => Validators.email(control),
        Validators.maxLength(254),
      ],
    ],
    displayName: [
      '',
      [(control: AbstractControl) => Validators.required(control), Validators.maxLength(160)],
    ],
  });
  protected readonly buildingForm = this.fb.nonNullable.group({
    code: [
      '',
      [(control: AbstractControl) => Validators.required(control), Validators.maxLength(64)],
    ],
    name: [
      '',
      [(control: AbstractControl) => Validators.required(control), Validators.maxLength(100)],
    ],
    numbers: ['', [(control: AbstractControl) => Validators.required(control)]],
    areaSqFt: ['', [Validators.pattern(/^[1-9]\d{0,7}\.\d{2}$/)]],
  });
  protected readonly residentForm = this.fb.nonNullable.group({
    flatId: ['', (control: AbstractControl) => Validators.required(control)],
    displayName: [
      '',
      [(control: AbstractControl) => Validators.required(control), Validators.maxLength(160)],
    ],
    occupancyType: ['OWNER', (control: AbstractControl) => Validators.required(control)],
    startsOn: [
      new Date().toISOString().slice(0, 10),
      (control: AbstractControl) => Validators.required(control),
    ],
    endsOn: [''],
  });
  protected readonly maintenanceForm = this.fb.nonNullable.group({
    code: [
      '',
      [
        (control: AbstractControl) => Validators.required(control),
        Validators.pattern(/^[A-Z][A-Z0-9_-]{1,63}$/),
      ],
    ],
    name: [
      '',
      [(control: AbstractControl) => Validators.required(control), Validators.maxLength(100)],
    ],
    method: ['FLAT_RATE', (control: AbstractControl) => Validators.required(control)],
    rate: [
      '',
      [
        (control: AbstractControl) => Validators.required(control),
        Validators.pattern(/^(?:0|[1-9]\d{0,9})\.\d{2}$/),
      ],
    ],
    effectiveFrom: [
      new Date().toISOString().slice(0, 10),
      (control: AbstractControl) => Validators.required(control),
    ],
  });
  ngOnInit(): void {
    void this.load();
  }
  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const detail = await this.api.get<SocietyDetail>(this.prefix);
      this.detail.set(detail);
      if (!detail.revision) return;
      await this.flatPage(1);
      if (!this.platform) {
        this.residents.set(await this.api.get<Page<Resident>>(this.prefix + '/residents'));
        await this.chargePage(1);
      }
    } catch (error) {
      this.error.set(onboardingError(error));
      this.detail.set(null);
    } finally {
      this.loading.set(false);
    }
  }
  protected async flatPage(page: number): Promise<void> {
    try {
      const data = await this.api.get<Page<Flat>>(this.prefix + '/structure?page=' + page);
      this.structure.set(data);
      this.flats.set(data.items);
      this.residentForm.controls.flatId.reset();
    } catch (error) {
      this.error.set(onboardingError(error));
    }
  }
  protected async chargePage(page: number): Promise<void> {
    try {
      const data = await this.api.get<Page<Configuration>>(
        this.prefix + '/maintenance?page=' + page,
      );
      this.chargesPage.set(data);
      this.configurations.set(data.items);
    } catch (error) {
      this.error.set(onboardingError(error));
    }
  }
  protected async residentPage(page: number): Promise<void> {
    try {
      this.residents.set(
        await this.api.get<Page<Resident>>(this.prefix + '/residents?page=' + page),
      );
    } catch (error) {
      this.error.set(onboardingError(error));
    }
  }
  private async run(
    work: (detail: SocietyDetail) => Promise<void>,
    success: string,
  ): Promise<void> {
    const detail = this.detail();
    if (!detail?.revision || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.message.set(null);
    try {
      await work(detail);
      this.message.set(success);
      await this.load();
    } catch (error) {
      this.error.set(onboardingError(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected async transition(status: SocietyStatus): Promise<void> {
    this.pendingStatus.set(null);
    await this.run(
      (detail) =>
        this.api.post(this.prefix + '/status', {
          revision: detail.revision,
          fromStatus: detail.status,
          status,
        }),
      'Society status updated.',
    );
  }
  protected async invite(): Promise<void> {
    this.inviteForm.markAllAsTouched();
    if (this.inviteForm.invalid) return;
    await this.run(
      (detail) =>
        this.api.post(this.prefix + '/committee-invitations', {
          revision: detail.revision,
          ...this.inviteForm.getRawValue(),
        }),
      'Invitation queued. Refresh to check delivery.',
    );
  }
  protected async building(): Promise<void> {
    this.buildingForm.markAllAsTouched();
    if (this.buildingForm.invalid) return;
    const value = this.buildingForm.getRawValue();
    const numbers = value.numbers
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (!numbers.length || numbers.length > 100) {
      this.error.set('Enter between 1 and 100 flat numbers.');
      return;
    }
    await this.run(async (detail) => {
      await this.api.post(this.prefix + '/buildings', {
        revision: detail.revision,
        code: value.code,
        name: value.name,
        flats: numbers.map((number) => ({ number, areaSqFt: value.areaSqFt || null })),
      });
      this.buildingForm.reset();
    }, 'Building and flats added.');
  }
  protected async resident(): Promise<void> {
    this.residentForm.markAllAsTouched();
    if (this.residentForm.invalid) return;
    const value = this.residentForm.getRawValue();
    await this.run(async (detail) => {
      await this.api.post(this.prefix + '/residents', {
        revision: detail.revision,
        ...value,
        endsOn: value.endsOn || null,
      });
      this.residentsAttested.set(false);
      this.residentForm.controls.displayName.reset();
    }, 'Resident added without a login account. Review the list again before confirming.');
  }
  protected async maintenance(): Promise<void> {
    this.maintenanceForm.markAllAsTouched();
    if (this.maintenanceForm.invalid) return;
    await this.run(async (detail) => {
      await this.api.post(this.prefix + '/maintenance', {
        revision: detail.revision,
        ...this.maintenanceForm.getRawValue(),
      });
      this.maintenanceAttested.set(false);
    }, 'Maintenance configuration added.');
  }
  protected async confirm(section: 'residents' | 'maintenance' | 'review'): Promise<void> {
    await this.run(
      (detail) =>
        this.api.post(this.prefix + '/' + section + '/confirm', {
          revision: detail.revision,
          confirmed: true,
        }),
      section === 'review'
        ? 'Setup reviewed. Use Verify & Activate to finish.'
        : 'Section confirmed.',
    );
  }
  protected async activate(): Promise<void> {
    this.activationDialog.set(false);
    await this.run(async (detail) => {
      await this.api.post(this.prefix + '/activate/confirm', {
        revision: detail.revision,
        confirmed: true,
      });
      await this.auth.refresh();
    }, 'Society activated. The committee can now open its community workspace.');
  }
}
