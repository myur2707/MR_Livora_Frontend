import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BillingApi } from '../../core/billing';
import type { Bill, BillPage } from '../../core/billing';
import { AuthState } from '../../core/auth-state';
import { PAYMENT_METHODS, paymentError, paymentMinor, paymentMoney } from '../../core/payments';
import type { Payment, PaymentResult } from '../../core/payments';
import { BillingPicker } from '../billing/picker';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { TableDirective } from '../../shared/table';
@Component({
  selector: 'se-payment-record',
  imports: [
    FormsModule,
    RouterLink,
    BillingPicker,
    ButtonDirective,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    PaginationComponent,
    TableDirective,
  ],
  templateUrl: './record.html',
})
export class PaymentRecordPage implements OnInit {
  private readonly api = inject(BillingApi);
  private readonly router = inject(Router);
  protected readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  protected readonly canRecord =
    inject(AuthState)
      .identity()
      ?.activeSociety?.permissions.includes(
        this.id ? 'society.finance.reverse' : 'society.finance.record',
      ) ?? false;
  protected readonly methods = PAYMENT_METHODS;
  protected readonly bills = signal<BillPage | null>(null);
  protected readonly original = signal<Payment | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly loading = signal(false);
  protected flatId = '';
  protected payerPersonId = '';
  protected collectedByUserId = '';
  protected method = 'CASH';
  protected paymentDate = '';
  protected amount = '';
  protected reference = '';
  protected notes = '';
  protected reason = '';
  protected operationDate = '';
  protected confirmed = false;
  protected selected: Record<string, string> = {};
  private requestKey = '';
  private sequence = 0;
  ngOnInit(): void {
    void this.initialize();
  }
  private async initialize(): Promise<void> {
    if (!this.id) return;
    try {
      const p = await this.api.get<Payment>('payments/' + this.id);
      this.original.set(p);
      this.flatId = p.flatId;
      this.payerPersonId = p.payerPersonId;
      this.collectedByUserId = p.collectedByUserId;
      this.method = p.method;
      this.paymentDate = p.paymentDate;
      this.amount = p.amount;
      this.reference = p.reference ?? '';
      this.notes = p.notes ?? '';
      this.selected = Object.fromEntries(p.allocations.map((a) => [a.billId, a.amount]));
      await this.loadBills();
    } catch (e) {
      this.error.set(paymentError(e));
    }
  }
  protected edited(): void {
    this.requestKey = '';
    this.confirmed = false;
  }
  protected async selectFlat(id: string): Promise<void> {
    this.flatId = id;
    this.selected = {};
    this.edited();
    await this.loadBills();
  }
  protected async loadBills(page = 1): Promise<void> {
    const n = ++this.sequence;
    this.loading.set(true);
    try {
      const result = await this.api.get<BillPage>(
        'bills?' +
          new URLSearchParams({
            flatId: this.flatId,
            page: String(page),
            status: this.id ? 'ISSUED' : 'OUTSTANDING',
          }).toString(),
      );
      if (n === this.sequence) {
        this.bills.set(result);
        this.error.set(null);
      }
    } catch (e) {
      if (n === this.sequence) {
        this.bills.set(null);
        this.error.set(paymentError(e));
      }
    } finally {
      if (n === this.sequence) this.loading.set(false);
    }
  }
  protected available(bill: Bill): string {
    const original = this.original()?.allocations.find((a) => a.billId === bill.id);
    return paymentMoney(
      (paymentMinor(bill.outstanding) ?? 0n) +
        (original ? (paymentMinor(original.amount) ?? 0n) : 0n),
    );
  }
  protected total(): string {
    let total = 0n;
    for (const amount of Object.values(this.selected)) {
      if (!amount) continue;
      const n = paymentMinor(amount);
      if (n === null) return 'Check amounts';
      total += n;
    }
    return paymentMoney(total);
  }
  protected async save(valid: boolean | null): Promise<void> {
    if (
      !valid ||
      !this.confirmed ||
      !this.canRecord ||
      !this.flatId ||
      !this.payerPersonId ||
      !this.collectedByUserId
    ) {
      this.error.set(
        'Complete required fields, select a payer and collector, and confirm the record.',
      );
      return;
    }
    const allocations = Object.entries(this.selected)
      .filter(([, v]) => v && v !== '0' && v !== '0.00')
      .map(([billId, amount]) => ({ billId, amount }));
    if (!allocations.length || this.total() !== paymentMoney(paymentMinor(this.amount) ?? -1n)) {
      this.error.set('Allocated total must equal the payment amount.');
      return;
    }
    this.requestKey ||= crypto.randomUUID();
    this.saving.set(true);
    this.error.set(null);
    const replacement = {
      flatId: this.flatId,
      payerPersonId: this.payerPersonId,
      collectedByUserId: this.collectedByUserId,
      method: this.method,
      paymentDate: this.paymentDate,
      amount: this.amount,
      reference: this.reference,
      notes: this.notes,
      allocations,
    };
    try {
      const result = await this.api.post<PaymentResult>(
        this.id ? 'payments/' + this.id + '/correct' : 'payments',
        this.id
          ? {
              reason: this.reason,
              operationDate: this.operationDate,
              idempotencyKey: this.requestKey,
              replacement,
            }
          : { ...replacement, idempotencyKey: this.requestKey },
      );
      await this.router.navigate([
        '/society/billing/payments',
        result.replacementPaymentId ?? result.paymentId,
      ]);
    } catch (e) {
      this.error.set(paymentError(e));
    } finally {
      this.saving.set(false);
    }
  }
}
