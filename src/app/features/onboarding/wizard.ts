import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
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
import { parseFlatNumbers, propertyNumberLimits, type FlatNumberPlan } from './flat-numbers';
import { parseWingCodes, type WingPlan } from './wing-codes';
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
  private readonly destroyRef = inject(DestroyRef);
  protected readonly displayTime = displaySocietyTime;
  protected readonly platform = this.route.snapshot.data['scope'] === 'platform';
  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly prefix =
    (this.platform ? '/platform' : '/onboarding') + '/societies/' + this.id;
  protected readonly detail = signal<SocietyDetail | null>(null);
  protected readonly flats = signal<Flat[]>([]);
  protected readonly structure = signal<Page<Flat> | null>(null);
  protected readonly residentStructure = signal<Page<Flat> | null>(null);
  protected readonly residentRowHouses = signal(false);
  protected readonly residentPropertySearch = signal('');
  protected readonly residentSelectedProperty = signal<Flat | null>(null);
  protected readonly residentPropertiesLoading = signal(false);
  private residentStructureRequest = 0;
  private residentSearchTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly chargesPage = signal<Page<Configuration> | null>(null);
  protected readonly residents = signal<Page<Resident> | null>(null);
  protected readonly configurations = signal<Configuration[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly wingOptions = ['A', 'B', 'C', 'D'];
  protected readonly multipleWings = signal(false);
  protected readonly rowHouses = signal(false);
  protected readonly numberLimits = computed(
    () => propertyNumberLimits[this.rowHouses() ? 'rowHouses' : 'flats'],
  );
  protected readonly selectedWings = signal<string[]>([]);
  protected readonly wingPlan = signal<WingPlan>({ codes: [], error: null });
  protected readonly batchError = computed(() =>
    this.wingPlan().codes.length * this.flatPlan().numbers.length > 500
      ? 'Add at most 500 flats across all wings per batch.'
      : null,
  );
  protected readonly flatPlan = signal<FlatNumberPlan>({ numbers: [], error: null });
  protected readonly loading = signal(true);
  protected readonly step = signal(0);
  protected readonly steps = [
    'Society or Township',
    'Committee Admin',
    'Buildings / Wings / Flats',
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
    name: ['', [Validators.maxLength(100)]],
    customCodes: [''],
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
    this.destroyRef.onDestroy(() => {
      if (this.residentSearchTimer) clearTimeout(this.residentSearchTimer);
    });
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
        await this.residentFlatPage(1);
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
    } catch (error) {
      this.error.set(onboardingError(error));
    }
  }
  protected async setResidentPropertyType(rowHouses: boolean): Promise<void> {
    if (this.residentSearchTimer) clearTimeout(this.residentSearchTimer);
    this.residentRowHouses.set(rowHouses);
    this.residentPropertySearch.set('');
    this.residentSelectedProperty.set(null);
    this.residentForm.controls.flatId.reset();
    await this.residentFlatPage(1);
  }
  protected searchResidentProperties(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    this.residentPropertySearch.set(input.value);
    if (this.residentSearchTimer) clearTimeout(this.residentSearchTimer);
    this.residentStructureRequest++;
    this.residentStructure.set(null);
    this.residentPropertiesLoading.set(true);
    this.residentSearchTimer = setTimeout(() => {
      this.residentSearchTimer = null;
      void this.residentFlatPage(1);
    }, 300);
  }
  protected selectResidentProperty(flat: Flat, picker: HTMLDetailsElement): void {
    this.residentSelectedProperty.set(flat);
    this.residentForm.controls.flatId.setValue(flat.id);
    picker.open = false;
  }
  protected async residentFlatPage(page: number): Promise<void> {
    const request = ++this.residentStructureRequest;
    this.residentPropertiesLoading.set(true);
    this.residentStructure.set(null);
    try {
      const data = await this.api.get<Page<Flat>>(
        this.prefix +
          '/structure?page=' +
          page +
          '&propertyType=' +
          (this.residentRowHouses() ? 'ROW_HOUSE' : 'FLAT') +
          '&search=' +
          encodeURIComponent(this.residentPropertySearch().trim()),
      );
      if (request === this.residentStructureRequest) this.residentStructure.set(data);
    } catch (error) {
      if (request === this.residentStructureRequest) this.error.set(onboardingError(error));
    } finally {
      if (request === this.residentStructureRequest) this.residentPropertiesLoading.set(false);
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
  protected previewFlats(): void {
    const plan = parseFlatNumbers(
      this.buildingForm.controls.numbers.value,
      this.rowHouses() ? 'rowHouses' : 'flats',
    );
    if (this.rowHouses() && plan.error)
      plan.error = plan.error.replaceAll('flat', 'row house').replace('per wing', 'per batch');
    this.flatPlan.set(plan);
  }
  protected setPropertyType(rowHouses: boolean): void {
    this.rowHouses.set(rowHouses);
    this.error.set(null);
    if (this.buildingForm.controls.numbers.value) this.previewFlats();
  }
  protected setWingMode(multiple: boolean): void {
    this.multipleWings.set(multiple);
    this.error.set(null);
  }
  protected toggleWing(code: string, event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    this.selectedWings.update((codes) =>
      checked ? [...codes, code] : codes.filter((v) => v !== code),
    );
    this.previewWings();
  }
  protected selectAllWings(): void {
    this.selectedWings.set([...this.wingOptions]);
    this.previewWings();
  }
  protected previewWings(): void {
    this.wingPlan.set(
      parseWingCodes(this.selectedWings(), this.buildingForm.controls.customCodes.value),
    );
  }
  protected async building(): Promise<void> {
    this.buildingForm.markAllAsTouched();
    const rowHouses = this.rowHouses();
    const multiple = !rowHouses && this.multipleWings();
    if (
      multiple || rowHouses
        ? this.buildingForm.controls.numbers.invalid || this.buildingForm.controls.areaSqFt.invalid
        : this.buildingForm.invalid
    )
      return;
    const value = this.buildingForm.getRawValue();
    this.previewFlats();
    if (multiple) this.previewWings();
    const { numbers, error } = this.flatPlan();
    const validationError = error || (multiple && (this.wingPlan().error || this.batchError()));
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    const flats = numbers.map((number) => ({ number, areaSqFt: value.areaSqFt || null }));
    const count = this.wingPlan().codes.length;
    await this.run(
      async (detail) => {
        if (rowHouses) {
          await this.api.post(this.prefix + '/row-houses', {
            revision: detail.revision,
            houses: flats,
          });
        } else if (multiple) {
          await this.api.post(this.prefix + '/buildings/batch', {
            revision: detail.revision,
            buildings: this.wingPlan().codes.map((code) => ({ code, name: 'Wing ' + code, flats })),
          });
        } else {
          await this.api.post(this.prefix + '/buildings', {
            revision: detail.revision,
            code: value.code,
            name: value.name.trim() || 'Wing ' + value.code.trim(),
            flats,
          });
        }
        this.buildingForm.reset();
        this.selectedWings.set([]);
        this.wingPlan.set({ codes: [], error: null });
        this.flatPlan.set({ numbers: [], error: null });
      },
      rowHouses
        ? numbers.length + ' row houses added.'
        : multiple
          ? count + ' wings and ' + count * numbers.length + ' flats added.'
          : 'Wing and flats added.',
    );
  }
  protected async resident(): Promise<void> {
    this.residentForm.markAllAsTouched();
    if (this.residentForm.invalid) return;
    const value = this.residentForm.getRawValue();
    await this.run(async (detail) => {
      await this.api.post(this.prefix + '/residents', {
        revision: detail.revision,
        ...value,
        propertyType: this.residentRowHouses() ? 'ROW_HOUSE' : 'FLAT',
        endsOn: value.endsOn || null,
      });
      this.residentsAttested.set(false);
      this.residentForm.controls.displayName.reset();
      this.residentForm.controls.flatId.reset();
      this.residentSelectedProperty.set(null);
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
