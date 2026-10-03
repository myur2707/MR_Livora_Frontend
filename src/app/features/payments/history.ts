import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BillingApi } from '../../core/billing';
import { AuthState } from '../../core/auth-state';
import type { Page } from '../../core/onboarding';
import { PAYMENT_METHODS, paymentError, paymentMinor, paymentMoney } from '../../core/payments';
import type { Payment, PaymentResult, CollectionReport } from '../../core/payments';
import { BillingPicker } from '../billing/picker';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { TableDirective } from '../../shared/table';
@Component({
  selector: 'se-payment-history',
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
  templateUrl: './history.html',
})
export class PaymentHistoryPage implements OnInit {
  private readonly api = inject(BillingApi);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private readonly auth = inject(AuthState);
  protected id = this.route.snapshot.paramMap.get('id');
  protected readonly report = this.route.snapshot.data['mode'] === 'report';
  protected readonly receipt = this.route.snapshot.data['mode'] === 'receipt';
  protected readonly methods = PAYMENT_METHODS;
  protected readonly payments = signal<Page<Payment> | null>(null);
  protected readonly collection = signal<CollectionReport | null>(null);
  protected readonly detail = signal<Payment | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected q = '';
  protected from = '';
  protected to = '';
  protected method = '';
  protected collectorUserId = '';
  protected action: 'reverse' | 'refund' | '' = '';
  protected reason = '';
  protected operationDate = '';
  protected refundMethod = 'CASH';
  protected reference = '';
  protected confirmed = false;
  protected allocations: Record<string, string> = {};
  private key = '';
  private sequence = 0;
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      this.id = params.get('id');
      this.detail.set(null);
      this.message.set(null);
      this.action = '';
      void this.load();
    });
  }
  protected can(permission: string): boolean {
    return this.auth.identity()?.activeSociety?.permissions.includes(permission) ?? false;
  }
  protected editable(): boolean {
    const p = this.detail();
    return !!p && p.status === 'RECORDED';
  }
  protected refundable(): boolean {
    const p = this.detail();
    return !!p && (p.status === 'RECORDED' || p.status === 'PARTIALLY_REFUNDED');
  }
  protected print(): void {
    this.document.defaultView?.print();
  }
  protected changed(): void {
    this.key = '';
    this.confirmed = false;
  }
  protected open(action: 'reverse' | 'refund'): void {
    this.action = action;
    this.allocations = {};
    this.reason = '';
    this.operationDate = '';
    this.reference = '';
    this.changed();
  }
  protected remaining(amount: string, refunded: string): string {
    return paymentMoney((paymentMinor(amount) ?? 0n) - (paymentMinor(refunded) ?? 0n));
  }
  protected refundTotal(): string {
    let n = 0n;
    for (const value of Object.values(this.allocations)) {
      if (!value) continue;
      const v = paymentMinor(value);
      if (v === null) return 'Invalid amount';
      n += v;
    }
    return paymentMoney(n);
  }
  protected async load(page = 1): Promise<void> {
    const n = ++this.sequence;
    this.loading.set(true);
    try {
      if (this.id) {
        const result = await this.api.get<Payment>(
          'payments/' + this.id + (this.receipt ? '/receipt' : ''),
        );
        if (n === this.sequence) this.detail.set(result);
      } else {
        const query = new URLSearchParams({ page: String(page), pageSize: '20', q: this.q });
        for (const [key, value] of Object.entries({
          from: this.from,
          to: this.to,
          method: this.method,
          collectorUserId: this.collectorUserId,
        }))
          if (value) query.set(key, value);
        if (this.report) {
          const result = await this.api.get<CollectionReport>(
            'payments/report?' + query.toString(),
          );
          if (n === this.sequence) this.collection.set(result);
        } else {
          const result = await this.api.get<Page<Payment>>('payments?' + query.toString());
          if (n === this.sequence) this.payments.set(result);
        }
      }
      if (n === this.sequence) this.error.set(null);
    } catch (e) {
      if (n === this.sequence) {
        this.detail.set(null);
        this.payments.set(null);
        this.collection.set(null);
        this.error.set(paymentError(e));
      }
    } finally {
      if (n === this.sequence) this.loading.set(false);
    }
  }
  protected async submit(valid: boolean | null): Promise<void> {
    if (!valid || !this.confirmed || !this.id || !this.action) {
      this.error.set('Complete the required fields and confirm the action.');
      return;
    }
    this.key ||= crypto.randomUUID();
    this.saving.set(true);
    this.error.set(null);
    const base = {
      reason: this.reason,
      operationDate: this.operationDate,
      idempotencyKey: this.key,
    };
    const allocations = Object.entries(this.allocations)
      .filter(([, v]) => v && (paymentMinor(v) ?? 0n) > 0n)
      .map(([billId, amount]) => ({ billId, amount }));
    try {
      await this.api.post<PaymentResult>(
        'payments/' + this.id + '/' + this.action,
        this.action === 'reverse'
          ? base
          : {
              ...base,
              amount: this.refundTotal(),
              method: this.refundMethod,
              reference: this.reference,
              allocations,
            },
      );
      this.message.set(
        this.action === 'refund'
          ? 'Refund recorded; allocated bill balances were restored.'
          : 'Reversal recorded; original payment and receipt retained.',
      );
      this.action = '';
      this.key = '';
      await this.load();
    } catch (e) {
      this.error.set(paymentError(e));
    } finally {
      this.saving.set(false);
    }
  }
}
