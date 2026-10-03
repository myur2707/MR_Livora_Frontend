import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResidentPortalApi } from '../../core/resident-portal';
import type { ResidentComplaint, ResidentFlat, ResidentNotice } from '../../core/resident-portal';
import type { Page } from '../../core/onboarding';
import { billingError } from '../../core/billing';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { CardComponent } from '../../shared/card';
import { ResidentView } from './view';
import { COMPLAINT_CATEGORIES } from '../../core/community';
import type { ComplaintHistory } from '../../core/community';
@Component({
  selector: 'se-resident-community',
  imports: [
    FormsModule,
    RouterLink,
    ButtonDirective,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    PaginationComponent,
    CardComponent,
  ],
  templateUrl: './community.html',
})
export class ResidentCommunityPage {
  private readonly api = inject(ResidentPortalApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly notices = this.route.snapshot.data['kind'] === 'notices';
  protected readonly feed = new ResidentView<Page<ResidentNotice>>();
  protected readonly requests = new ResidentView<Page<ResidentComplaint>>();
  protected readonly notice = new ResidentView<ResidentNotice>();
  protected readonly complaint = new ResidentView<ResidentComplaint>();
  protected readonly flats = new ResidentView<Page<ResidentFlat>>();
  protected readonly saving = signal(false);
  protected readonly history = new ResidentView<Page<ComplaintHistory>>();
  protected readonly categories = COMPLAINT_CATEGORIES;
  protected category = 'OTHER';
  protected readonly submitError = signal<string | null>(null);
  protected readonly attempted = signal(false);
  protected id: string | null = null;
  protected flatId = '';
  protected title = '';
  protected description = '';
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((params) => {
      this.id = params.get('id');
      void this.load();
      if (!this.notices && this.id) void this.loadHistory();
      if (!this.notices && !this.id) void this.loadFlats();
    });
  }
  protected load(page = 1): Promise<void> {
    if (this.notices)
      return this.id
        ? this.notice.load(() => this.api.get<ResidentNotice>('notices/' + this.id))
        : this.feed.load(() => this.api.list<ResidentNotice>('notices', page));
    return this.id
      ? this.complaint.load(() => this.api.get<ResidentComplaint>('complaints/' + this.id))
      : this.requests.load(() => this.api.list<ResidentComplaint>('complaints', page));
  }
  protected loadFlats(page = 1): Promise<void> {
    this.flatId = '';
    return this.flats.load(() => this.api.list<ResidentFlat>('flats', page));
  }
  protected loadHistory(page = 1): Promise<void> {
    return this.history.load(() =>
      this.api.list<ComplaintHistory>('complaints/' + this.id + '/history', page),
    );
  }
  protected error(field: 'flat' | 'title' | 'description'): string | null {
    if (!this.attempted()) return null;
    if (field === 'flat') return this.flatId ? null : 'Choose one of your authorized flats.';
    const value = field === 'title' ? this.title : this.description;
    return !value.trim()
      ? 'Enter ' + field + '.'
      : value.length > (field === 'title' ? 200 : 4000)
        ? 'Shorten this ' + field + '.'
        : null;
  }
  protected async submit(): Promise<void> {
    if (this.saving()) return;
    this.attempted.set(true);
    if (this.error('flat') || this.error('title') || this.error('description')) return;
    this.saving.set(true);
    this.submitError.set(null);
    try {
      const result = await this.api.complain({
        category: this.category,
        flatId: this.flatId,
        title: this.title.trim(),
        description: this.description.trim(),
      });
      await this.router.navigate(['/society/resident/complaints', result.id]);
    } catch (error) {
      this.submitError.set(billingError(error) + ' Check your complaint history before retrying.');
    } finally {
      this.saving.set(false);
    }
  }
}
