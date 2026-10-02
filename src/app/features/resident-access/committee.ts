import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ResidentAccessApi, residentAccessError } from '../../core/resident-access';
import type { ResidentInvitation, RegistrationRequest } from '../../core/resident-access';
import type { Page } from '../../core/onboarding';
import { PropertyApi, occupancyTypes } from '../../core/property';
import type { Occupancy } from '../../core/property';
import { ResourcePicker } from '../property/picker';
import { ButtonDirective } from '../../shared/button';
import { BadgeComponent } from '../../shared/badge';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { TableDirective } from '../../shared/table';
import { DialogComponent } from '../../shared/dialog';
import { StateComponent } from '../../shared/state';
type ReviewPage = Page<RegistrationRequest> & { today: string };
type Confirmation =
  | { action: 'resend' | 'revoke'; invitation: ResidentInvitation }
  | { action: 'reject'; request: RegistrationRequest };
@Component({
  selector: 'se-resident-access-committee',
  imports: [
    FormsModule,
    DatePipe,
    ResourcePicker,
    ButtonDirective,
    BadgeComponent,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    PaginationComponent,
    TableDirective,
    DialogComponent,
    StateComponent,
  ],
  templateUrl: './committee.html',
})
export class ResidentAccessCommittee implements OnInit {
  private readonly api = inject(ResidentAccessApi);
  private readonly property = inject(PropertyApi);
  protected readonly types = occupancyTypes;
  protected readonly requests = signal<ReviewPage | null>(null);
  protected readonly invitations = signal<Page<ResidentInvitation> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly message = signal('');
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly inviting = signal(false);
  protected readonly reviewing = signal<RegistrationRequest | null>(null);
  protected readonly confirmation = signal<Confirmation | null>(null);
  protected readonly occupancies = signal<Page<Occupancy> | null>(null);
  protected tab: 'requests' | 'invitations' = 'requests';
  protected status = 'PENDING';
  protected invitePerson = '';
  protected inviteFlat = '';
  protected inviteVerified = false;
  protected existingPerson = false;
  protected personId = '';
  protected flatId = '';
  protected occupancyType = 'TENANT';
  protected startsOn = '';
  protected endsOn = '';
  protected reuseOccupancy = false;
  protected existingOccupancyId = '';
  protected verificationNote = '';
  protected verified = false;
  protected decisionNote = '';
  private sequence = 0;
  ngOnInit(): void {
    void this.load();
  }
  protected chooseTab(tab: 'requests' | 'invitations'): void {
    this.tab = tab;
    this.status = 'PENDING';
    void this.load();
  }
  protected async load(page = 1): Promise<void> {
    const n = ++this.sequence;
    this.loading.set(true);
    try {
      const path =
        this.tab === 'requests'
          ? '/society/registration-requests'
          : '/society/resident-invitations';
      const query = '?status=' + encodeURIComponent(this.status) + '&page=' + page;
      if (this.tab === 'requests') {
        const data = await this.api.get<ReviewPage>(path + query);
        if (n === this.sequence) this.requests.set(data);
      } else {
        const data = await this.api.get<Page<ResidentInvitation>>(path + query);
        if (n === this.sequence) this.invitations.set(data);
      }
      if (n === this.sequence) this.error.set(null);
    } catch (e) {
      if (n === this.sequence) {
        this.requests.set(null);
        this.invitations.set(null);
        this.error.set(residentAccessError(e));
      }
    } finally {
      if (n === this.sequence) this.loading.set(false);
    }
  }
  protected openInvite(): void {
    this.invitePerson = '';
    this.inviteFlat = '';
    this.inviteVerified = false;
    this.formError.set(null);
    this.inviting.set(true);
  }
  protected async invite(): Promise<void> {
    if (this.busy()) return;
    if (!this.invitePerson || !this.inviteFlat || !this.inviteVerified) {
      this.formError.set('Select a person and flat, then confirm identity and current residency.');
      return;
    }
    this.busy.set(true);
    this.formError.set(null);
    try {
      await this.api.post('/society/resident-invitations', {
        personId: this.invitePerson,
        flatId: this.inviteFlat,
        confirmed: true,
      });
      this.inviting.set(false);
      this.message.set('Invitation queued. Check delivery status; resend if delivery fails.');
      await this.load();
    } catch (e) {
      this.formError.set(residentAccessError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected review(row: RegistrationRequest): void {
    this.reviewing.set(row);
    this.existingPerson = false;
    this.personId = '';
    this.flatId = row.flatId;
    this.occupancyType = row.occupancyType;
    this.startsOn = this.requests()?.today ?? '';
    this.endsOn = '';
    this.verified = false;
    this.verificationNote = '';
    this.reuseOccupancy = false;
    this.existingOccupancyId = '';
    this.occupancies.set(null);
    this.formError.set(null);
  }
  protected selectPerson(id: string): void {
    this.personId = id;
    this.existingOccupancyId = '';
    this.occupancies.set(null);
  }
  protected selectFlat(id: string): void {
    this.flatId = id;
    this.existingOccupancyId = '';
    this.occupancies.set(null);
  }
  protected async loadOccupancies(page = 1): Promise<void> {
    if (!this.flatId || !this.personId) {
      this.formError.set('Choose the verified existing person and flat first.');
      return;
    }
    try {
      this.occupancies.set(
        await this.property.get<Page<Occupancy>>('flats/' + this.flatId + '/occupancies', {
          filter: 'current',
          page,
          pageSize: 20,
        }),
      );
      this.formError.set(null);
    } catch (e) {
      this.formError.set(residentAccessError(e));
    }
  }
  protected matchingOccupancies(): Occupancy[] {
    return this.occupancies()?.items.filter((o) => o.personId === this.personId) ?? [];
  }
  protected async approve(valid: boolean | null): Promise<void> {
    const row = this.reviewing();
    if (!row || this.busy()) return;
    if (
      !valid ||
      !this.verified ||
      !this.flatId ||
      (this.existingPerson && !this.personId) ||
      (this.reuseOccupancy && (!this.existingPerson || !this.existingOccupancyId)) ||
      !this.startsOn ||
      (this.endsOn && this.endsOn < this.startsOn)
    ) {
      this.formError.set(
        'Verify identity and current residency, choose the correct person and flat, and enter valid dates and a verification note.',
      );
      return;
    }
    this.busy.set(true);
    this.formError.set(null);
    try {
      await this.api.post('/society/registration-requests/' + row.id + '/approve', {
        confirmed: true,
        note: this.verificationNote,
        personId: this.existingPerson ? this.personId : null,
        flatId: this.flatId,
        existingOccupancyId: this.reuseOccupancy ? this.existingOccupancyId : null,
        occupancyType: this.occupancyType,
        startsOn: this.startsOn,
        endsOn: this.endsOn || null,
      });
      this.reviewing.set(null);
      this.message.set(
        'Request approved. Person, Resident membership and verified occupancy were linked together.',
      );
      await this.load();
    } catch (e) {
      this.formError.set(residentAccessError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected confirm(value: Confirmation): void {
    this.confirmation.set(value);
    this.decisionNote = '';
    this.formError.set(null);
  }
  protected async decide(valid: boolean | null): Promise<void> {
    const value = this.confirmation();
    if (!value || this.busy()) return;
    if (!valid) {
      this.formError.set('Enter a decision note.');
      return;
    }
    this.busy.set(true);
    this.formError.set(null);
    try {
      const path =
        value.action === 'reject'
          ? '/society/registration-requests/' + value.request.id + '/reject'
          : '/society/resident-invitations/' + value.invitation.id + '/' + value.action;
      await this.api.post(path, { confirmed: true, note: this.decisionNote });
      this.confirmation.set(null);
      this.message.set(
        value.action === 'resend'
          ? 'A replacement invitation was queued. The previous link is invalid.'
          : value.action === 'revoke'
            ? 'Invitation revoked.'
            : 'Request rejected. No membership or occupancy was created.',
      );
      await this.load();
    } catch (e) {
      this.formError.set(residentAccessError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
