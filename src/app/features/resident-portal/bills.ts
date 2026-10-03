import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { ResidentPortalApi, residentMoney } from '../../core/resident-portal';
import type { ResidentBill } from '../../core/resident-portal';
import type { Page } from '../../core/onboarding';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { TableDirective } from '../../shared/table';
import { ResidentView } from './view';
@Component({
  selector: 'se-resident-bills',
  imports: [
    FormsModule,
    RouterLink,
    ButtonDirective,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    PaginationComponent,
    TableDirective,
  ],
  templateUrl: './bills.html',
})
export class ResidentBillsPage {
  private readonly api = inject(ResidentPortalApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly list = new ResidentView<Page<ResidentBill>>();
  protected readonly detail = new ResidentView<ResidentBill>();
  protected readonly money = residentMoney;
  protected id: string | null = null;
  protected status = 'ALL';
  protected flatId = '';
  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(([params, query]) => {
        this.id = params.get('id');
        this.flatId = query.get('flatId') ?? '';
        void this.load();
      });
  }
  protected load(page = 1): Promise<void> {
    if (this.id) return this.detail.load(() => this.api.get<ResidentBill>('bills/' + this.id));
    const filters: Record<string, string> = { status: this.status };
    if (this.flatId) filters['flatId'] = this.flatId;
    return this.list.load(() => this.api.list<ResidentBill>('bills', page, filters));
  }
}
