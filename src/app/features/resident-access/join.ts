import { Component, effect, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { ResidentAccessApi, residentAccessError } from '../../core/resident-access';
import type { RegistrationRequest } from '../../core/resident-access';
import type { Page } from '../../core/onboarding';
import { occupancyTypes } from '../../core/property';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { BadgeComponent } from '../../shared/badge';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { TableDirective } from '../../shared/table';
import { DialogComponent } from '../../shared/dialog';
import { StateComponent } from '../../shared/state';
import { ToastService } from '../../shared/toast';
interface JoinSocietyOption {
  code: string;
  name: string;
}
type JoinPropertyType = 'FLAT' | 'ROW_HOUSE';
interface JoinPropertyOption {
  buildingCode: string;
  buildingName: string;
  flatNumber: string;
  propertyType: JoinPropertyType;
}
@Component({
  selector: 'se-resident-join',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonDirective,
    CardComponent,
    BadgeComponent,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    PaginationComponent,
    TableDirective,
    DialogComponent,
    StateComponent,
  ],
  templateUrl: './join.html',
})
export class ResidentJoin implements OnInit {
  private readonly api = inject(ResidentAccessApi);
  private readonly fb = inject(FormBuilder);
  protected readonly types = occupancyTypes;
  protected readonly result = signal<Page<RegistrationRequest> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly requestError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(false);
  protected readonly message = signal('');
  private readonly toast = inject(ToastService);
  protected readonly cancelling = signal<RegistrationRequest | null>(null);
  protected readonly showRequest = signal(false);
  protected readonly searchControl = this.fb.nonNullable.control('', Validators.maxLength(80));
  protected societyCode = '';
  protected buildingCode = '';
  protected flatNumber = '';
  protected selectedPropertyType: JoinPropertyType | '' = '';
  protected selectedPropertyKey = '';
  protected readonly societyOptions = signal<JoinSocietyOption[]>([]);
  protected readonly propertyOptions = signal<JoinPropertyOption[]>([]);
  protected readonly loadingSocieties = signal(false);
  protected readonly loadingProperties = signal(false);
  protected displayName = '';
  protected contactPhone = '';
  protected note = '';
  protected occupancyType = 'OWNER';
  protected status = 'all';
  private sequence = 0;
  private societyOptionSequence = 0;
  private propertyOptionSequence = 0;
  constructor() {
    effect(() => {
      const message = this.message();
      if (message) this.toast.show(message, 'success');
    });
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
    const sequence = ++this.sequence;
    this.loading.set(true);
    try {
      const result = await this.api.get<Page<RegistrationRequest>>(
        '/resident-access/requests?status=' +
          encodeURIComponent(this.status) +
          '&search=' +
          encodeURIComponent(this.searchControl.value.trim()) +
          '&page=' +
          page,
      );
      if (sequence === this.sequence) {
        this.result.set(result);
        this.error.set(null);
      }
    } catch (e) {
      if (sequence === this.sequence) {
        this.result.set(null);
        this.error.set(residentAccessError(e));
      }
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }
  protected openRequest(): void {
    this.requestError.set(null);
    this.showRequest.set(true);
    void this.loadSocietyOptions();
  }
  protected closeRequest(): void {
    if (this.busy()) return;
    this.showRequest.set(false);
    this.requestError.set(null);
  }
  protected async submit(valid: boolean | null): Promise<void> {
    if (!valid) {
      this.requestError.set('Enter your name, then select a community and an address.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    this.requestError.set(null);
    try {
      await this.api.post('/resident-access/requests', {
        societyCode: this.societyCode,
        buildingCode: this.buildingCode,
        flatNumber: this.flatNumber,
        displayName: this.displayName,
        contactPhone: this.contactPhone.trim() || null,
        note: this.note.trim() || null,
        occupancyType: this.occupancyType,
      });
      this.message.set(
        'Request submitted. No society or flat access is granted until committee approval.',
      );
      this.showRequest.set(false);
      await this.load();
    } catch (e) {
      this.requestError.set(residentAccessError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected selectSociety(code: string): void {
    this.propertyOptionSequence++;
    this.societyCode = code;
    this.buildingCode = '';
    this.flatNumber = '';
    this.selectedPropertyType = '';
    this.selectedPropertyKey = '';
    this.propertyOptions.set([]);
    if (code) void this.loadPropertyOptions();
  }
  protected selectPropertyType(type: JoinPropertyType | ''): void {
    this.selectedPropertyType = type;
    this.buildingCode = '';
    this.flatNumber = '';
    this.selectedPropertyKey = '';
  }
  protected selectProperty(key: string): void {
    this.selectedPropertyKey = key;
    const selected = this.propertyOptions().find((option) => this.propertyKey(option) === key);
    this.buildingCode = selected?.buildingCode ?? '';
    this.flatNumber = selected?.flatNumber ?? '';
  }
  protected propertyKey(option: JoinPropertyOption): string {
    return encodeURIComponent(option.buildingCode) + ':' + encodeURIComponent(option.flatNumber);
  }
  protected propertyLabel(option: JoinPropertyOption): string {
    return option.propertyType === 'ROW_HOUSE'
      ? 'Row house ' + option.flatNumber
      : option.buildingName + ' · Flat ' + option.flatNumber;
  }
  protected propertyTypes(): JoinPropertyType[] {
    return [...new Set(this.propertyOptions().map((option) => option.propertyType))];
  }
  protected filteredPropertyOptions(): JoinPropertyOption[] {
    return this.propertyOptions().filter(
      (option) => option.propertyType === this.selectedPropertyType,
    );
  }
  protected propertyTypeLabel(type: JoinPropertyType): string {
    return type === 'FLAT' ? 'Flat' : 'Row house';
  }
  private async loadSocietyOptions(): Promise<void> {
    const sequence = ++this.societyOptionSequence;
    this.loadingSocieties.set(true);
    try {
      const options = await this.api.get<{ items: JoinSocietyOption[] }>(
        '/resident-access/join-options/societies',
      );
      if (sequence === this.societyOptionSequence) this.societyOptions.set(options.items);
    } catch (error) {
      if (sequence === this.societyOptionSequence)
        this.requestError.set(residentAccessError(error));
    } finally {
      if (sequence === this.societyOptionSequence) this.loadingSocieties.set(false);
    }
  }
  private async loadPropertyOptions(): Promise<void> {
    if (!this.societyCode) return;
    const sequence = ++this.propertyOptionSequence;
    this.loadingProperties.set(true);
    try {
      const options = await this.api.get<{ items: JoinPropertyOption[] }>(
        '/resident-access/join-options/properties?societyCode=' +
          encodeURIComponent(this.societyCode),
      );
      if (sequence === this.propertyOptionSequence) {
        this.propertyOptions.set(options.items);
        const types = [...new Set(options.items.map((option) => option.propertyType))];
        this.selectedPropertyType = types.length === 1 ? (types[0] ?? '') : '';
      }
    } catch (error) {
      if (sequence === this.propertyOptionSequence)
        this.requestError.set(residentAccessError(error));
    } finally {
      if (sequence === this.propertyOptionSequence) this.loadingProperties.set(false);
    }
  }
  protected async cancel(): Promise<void> {
    const request = this.cancelling();
    if (!request || this.busy()) return;
    this.busy.set(true);
    try {
      await this.api.post('/resident-access/requests/' + request.id + '/cancel', {
        confirmed: true,
        note: 'Cancelled by applicant',
      });
      this.cancelling.set(null);
      this.message.set('Request cancelled.');
      await this.load();
    } catch (e) {
      this.error.set(residentAccessError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
