import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResidentPortalApi, residentMoney } from '../../core/resident-portal';
import type { ResidentPayment } from '../../core/resident-portal';
import type { Page } from '../../core/onboarding';
import { ButtonDirective } from '../../shared/button';
import { FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { TableDirective } from '../../shared/table';
import { ResidentView } from './view';
@Component({
  selector: 'se-resident-payments',
  imports: [RouterLink, ButtonDirective, FormNoticeComponent, PaginationComponent, TableDirective],
  templateUrl: './payments.html',
})
export class ResidentPaymentsPage {
  private readonly api = inject(ResidentPortalApi);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  protected readonly list = new ResidentView<Page<ResidentPayment>>();
  protected readonly detail = new ResidentView<ResidentPayment>();
  protected readonly money = residentMoney;
  protected readonly receipts = this.route.snapshot.data['mode'] === 'receipts';
  protected id: string | null = null;
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((params) => {
      this.id = params.get('id');
      void this.load();
    });
  }
  protected load(page = 1): Promise<void> {
    return this.id
      ? this.detail.load(() => this.api.get<ResidentPayment>('payments/' + this.id + '/receipt'))
      : this.list.load(() =>
          this.api.list<ResidentPayment>(this.receipts ? 'receipts' : 'payments', page),
        );
  }
  protected print(): void {
    this.document.defaultView?.print();
  }
}
