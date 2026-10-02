import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
@Component({
  selector: 'se-resident-join',
  imports: [
    FormsModule,
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
  protected readonly types = occupancyTypes;
  protected readonly result = signal<Page<RegistrationRequest> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly cancelling = signal<RegistrationRequest | null>(null);
  protected societyCode = '';
  protected buildingCode = '';
  protected flatNumber = '';
  protected displayName = '';
  protected contactPhone = '';
  protected note = '';
  protected occupancyType = 'TENANT';
  protected status = 'all';
  private sequence = 0;
  ngOnInit(): void {
    void this.load();
  }
  protected async load(page = 1): Promise<void> {
    const sequence = ++this.sequence;
    this.loading.set(true);
    try {
      const result = await this.api.get<Page<RegistrationRequest>>(
        '/resident-access/requests?status=' + encodeURIComponent(this.status) + '&page=' + page,
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
  protected async submit(valid: boolean | null): Promise<void> {
    if (!valid) {
      this.error.set('Enter your name, society code, building code and flat number.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
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
      await this.load();
    } catch (e) {
      this.error.set(residentAccessError(e));
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
