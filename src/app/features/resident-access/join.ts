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
  protected displayName = '';
  protected contactPhone = '';
  protected note = '';
  protected occupancyType = 'OWNER';
  protected status = 'all';
  private sequence = 0;
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
  }
  protected closeRequest(): void {
    if (this.busy()) return;
    this.showRequest.set(false);
    this.requestError.set(null);
  }
  protected async submit(valid: boolean | null): Promise<void> {
    if (!valid) {
      this.requestError.set('Enter your name, society code, building code and flat number.');
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
