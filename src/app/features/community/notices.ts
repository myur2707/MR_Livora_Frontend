import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommunityApi } from '../../core/community';
import type { CommunityNotice } from '../../core/community';
import type { Page } from '../../core/onboarding';
import { AuthState } from '../../core/auth-state';
import { billingError } from '../../core/billing';
import { ResidentView as PrivateView } from '../resident-portal/view';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { CardComponent } from '../../shared/card';
@Component({
  selector: 'se-community-notices',
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
      this.create = this.route.snapshot.data['create'] === true;
      this.title = '';
      this.body = '';
      this.error.set(null);
      this.attempted.set(false);
      void this.load();
    });
  }
  protected async load(page = 1): Promise<void> {
    if (this.create) return;
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
