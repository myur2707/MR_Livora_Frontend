import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommunityApi, communityStatusTone } from '../../core/community';
import type { CommunityNotice } from '../../core/community';
import type { Page } from '../../core/onboarding';
import { AuthState } from '../../core/auth-state';
import { billingError } from '../../core/billing';
import { ResidentView as PrivateView } from '../resident-portal/view';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { CardComponent } from '../../shared/card';
import { BadgeComponent } from '../../shared/badge';
import { DialogComponent } from '../../shared/dialog';
import { IconComponent } from '../../shared/icon';
import { TableDirective } from '../../shared/table';
import { LabelPipe } from '../../shared/label';
@Component({
  selector: 'se-community-notices',
  imports: [
    LabelPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonDirective,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    PaginationComponent,
    CardComponent,
    BadgeComponent,
    DialogComponent,
    IconComponent,
    TableDirective,
  ],
  templateUrl: './notices.html',
})
export class CommitteeNoticesPage {
  protected readonly auth = inject(AuthState);
  private readonly api = inject(CommunityApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly list = new PrivateView<Page<CommunityNotice>>();
  protected readonly detail = new PrivateView<CommunityNotice>();
  protected readonly saving = signal(false);
  protected readonly editing = signal(false);
  protected readonly tone = communityStatusTone;
  protected readonly error = signal<string | null>(null);
  protected readonly attempted = signal(false);
  protected id: string | null = null;
  protected create = false;
  protected title = '';
  protected body = '';
  protected status = 'ALL';
  protected search = '';
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((params) => {
      this.id = params.get('id');
      this.editing.set(false);
      // The /notices/new deep link opens the draft dialog over the notice list.
      if (this.route.snapshot.data['create'] === true) this.openCreator();
      void this.load();
    });
  }
  protected async load(page = 1): Promise<void> {
    if (this.id) {
      await this.detail.load(() => this.api.get<CommunityNotice>('notices/' + this.id));
      const item = this.detail.value();
      this.title = item?.title ?? '';
      this.body = item?.body ?? '';
    } else
      await this.list.load(() =>
        this.api.list<CommunityNotice>('notices', page, {
          status: this.status,
          search: this.search,
        }),
      );
  }
  protected openCreator(): void {
    this.create = true;
    this.resetForm('', '');
  }
  protected openEditor(): void {
    const item = this.detail.value();
    if (!item) return;
    this.create = false;
    this.resetForm(item.title, item.body);
  }
  protected closeEditor(): void {
    this.editing.set(false);
    if (this.route.snapshot.data['create'] === true)
      void this.router.navigate(['/society/community/notices']);
  }
  private resetForm(title: string, body: string): void {
    this.title = title;
    this.body = body;
    this.error.set(null);
    this.attempted.set(false);
    this.editing.set(true);
  }
  protected fieldError(field: 'title' | 'body'): string | null {
    if (!this.attempted()) return null;
    const value = field === 'title' ? this.title : this.body;
    return !value.trim()
      ? 'Enter ' + field + '.'
      : value.length > (field === 'title' ? 200 : 8000)
        ? 'Shorten this ' + field + '.'
        : null;
  }
  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.attempted.set(true);
    if (this.fieldError('title') || this.fieldError('body')) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const item = this.detail.value();
      const result = await this.api.post<{ id: string }>(
        this.create ? 'notices' : 'notices/' + this.id + '/edit',
        {
          title: this.title.trim(),
          body: this.body.trim(),
          ...(this.create ? {} : { revision: item?.revision }),
        },
      );
      this.editing.set(false);
      if (this.create) await this.router.navigate(['/society/community/notices', result.id]);
      else await this.load();
    } catch (error) {
      this.error.set(billingError(error));
    } finally {
      this.saving.set(false);
    }
  }
  protected async action(action: 'PUBLISH' | 'ARCHIVE'): Promise<void> {
    const item = this.detail.value();
    if (!item || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.post('notices/' + item.id + '/action', { revision: item.revision, action });
      await this.load();
    } catch (error) {
      this.error.set(billingError(error));
    } finally {
      this.saving.set(false);
    }
  }
}
