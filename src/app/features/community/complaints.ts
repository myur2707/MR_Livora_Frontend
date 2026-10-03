import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CommunityApi,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  complaintNext,
} from '../../core/community';
import type { CommitteeComplaint, ComplaintHistory, ComplaintAssignee } from '../../core/community';
import type { Page } from '../../core/onboarding';
import { AuthState } from '../../core/auth-state';
import { billingError } from '../../core/billing';
import { ResidentView as PrivateView } from '../resident-portal/view';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { CardComponent } from '../../shared/card';
@Component({
  selector: 'se-committee-complaints',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonDirective,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    PaginationComponent,
    CardComponent,
  ],
  templateUrl: './complaints.html',
})
export class CommitteeComplaintsPage {
  protected readonly auth = inject(AuthState);
  private readonly api = inject(CommunityApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly list = new PrivateView<Page<CommitteeComplaint>>();
  protected readonly detail = new PrivateView<CommitteeComplaint>();
  protected readonly history = new PrivateView<Page<ComplaintHistory>>();
  protected readonly assignees = new PrivateView<Page<ComplaintAssignee>>();
  protected readonly categories = COMPLAINT_CATEGORIES;
  protected readonly statuses = COMPLAINT_STATUSES;
  protected readonly next = complaintNext;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly attempted = signal(false);
  protected id: string | null = null;
  protected status = 'ALL';
  protected category = 'ALL';
  protected target = '';
  protected assignee = '';
  protected note = '';
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((params) => {
      this.id = params.get('id');
      this.note = '';
      this.error.set(null);
      this.attempted.set(false);
      void this.load();
    });
  }
  protected async load(page = 1): Promise<void> {
    if (!this.id) {
      await this.list.load(() =>
        this.api.list<CommitteeComplaint>('complaints', page, {
          status: this.status,
          category: this.category,
        }),
      );
      return;
    }
    await this.detail.load(() => this.api.get<CommitteeComplaint>('complaints/' + this.id));
    const item = this.detail.value();
    this.target = item ? (complaintNext(item.status) ?? '') : '';
    this.assignee = item?.assigneeMembershipId ?? '';
    if (item) await Promise.all([this.loadHistory(), this.loadAssignees()]);
  }
  protected loadHistory(page = 1): Promise<void> {
    return this.history.load(() =>
      this.api.list<ComplaintHistory>('complaints/' + this.id + '/history', page),
    );
  }
  protected loadAssignees(page = 1): Promise<void> {
    return this.assignees.load(() =>
      this.api.list<ComplaintAssignee>('complaints/assignees', page),
    );
  }
  protected noteError(): string | null {
    return this.attempted() && (!this.note.trim() || this.note.length > 1000)
      ? 'Enter an update of up to 1000 characters.'
      : null;
  }
  protected assigneeError(): string | null {
    return this.attempted() && ['ASSIGNED', 'IN_PROGRESS'].includes(this.target) && !this.assignee
      ? 'Choose an active committee assignee.'
      : null;
  }
  protected async save(): Promise<void> {
    const item = this.detail.value();
    if (!item || this.saving() || !this.target) return;
    this.attempted.set(true);
    if (this.noteError() || this.assigneeError()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.post('complaints/' + item.id + '/status', {
        revision: item.revision,
        status: this.target,
        note: this.note.trim(),
        ...(['ASSIGNED', 'IN_PROGRESS'].includes(this.target)
          ? { assigneeMembershipId: this.assignee }
          : {}),
      });
      this.note = '';
      this.attempted.set(false);
      await this.load();
    } catch (error) {
      this.error.set(billingError(error));
    } finally {
      this.saving.set(false);
    }
  }
}
