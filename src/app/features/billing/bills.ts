import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BillingApi, billingError } from '../../core/billing';
import type { Bill, BillPage } from '../../core/billing';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { TableDirective } from '../../shared/table';
@Component({
  selector: 'se-billing-bills',
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
export class BillingBillsPage implements OnInit {
  private readonly api = inject(BillingApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly report = this.route.snapshot.data['mode'] === 'outstanding';
  protected readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly page = signal<BillPage | null>(null);
  protected readonly bill = signal<Bill | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected q = '';
  protected status = 'ALL';
  private sequence = 0;
  ngOnInit(): void {
    void this.load();
  }
  protected async load(page = 1): Promise<void> {
    const n = ++this.sequence;
    this.loading.set(true);
    try {
      if (this.id) {
        const result = await this.api.get<Bill>('bills/' + this.id);
        if (n === this.sequence) this.bill.set(result);
      } else {
        const result = await this.api.get<BillPage>(
          (this.report ? 'outstanding' : 'bills') +
            '?' +
            new URLSearchParams({ page: String(page), q: this.q, status: this.status }).toString(),
        );
        if (n === this.sequence) this.page.set(result);
      }
      if (n === this.sequence) this.error.set(null);
    } catch (e) {
      if (n === this.sequence) {
        this.page.set(null);
        this.bill.set(null);
        this.error.set(billingError(e));
      }
    } finally {
      if (n === this.sequence) this.loading.set(false);
    }
  }
}
