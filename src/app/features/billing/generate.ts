import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { BillingApi, billingError, choiceLabel } from '../../core/billing';
import type { BillingChoice, BillingPreview, BillingRequest, Discount } from '../../core/billing';
import type { Page } from '../../core/onboarding';
import { AuthState } from '../../core/auth-state';
import { BillingPicker } from './picker';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { TableDirective } from '../../shared/table';
@Component({
  selector: 'se-billing-generate',
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
  templateUrl: './generate.html',
})
export class BillingGeneratePage implements OnInit {
  private readonly api = inject(BillingApi);
  private readonly auth = inject(AuthState);
  protected readonly flats = signal<Page<BillingChoice> | null>(null);
  protected readonly chosen = signal<BillingChoice[]>([]);
  protected readonly preview = signal<BillingPreview | null>(null);
  protected readonly result = signal<{
    runId: string;
    billIds: string[];
    billCount: number;
    replayed: boolean;
  } | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(false);
  protected readonly display = choiceLabel;
  protected periodId = '';
  protected q = '';
  protected discounts: Discount[] = [];
  protected discountFlat = '';
  protected discountKind: 'FIXED' | 'PERCENT' = 'FIXED';
  protected discountValue = '';
  protected discountReason = '';
  protected confirmed = false;
  private request: BillingRequest | null = null;
  private key = '';
  private sequence = 0;
  protected permitted(permission: string): boolean {
    return !!this.auth
      .identity()
      ?.activeSociety?.permissions.includes('society.finance.' + permission);
  }
  ngOnInit(): void {
    void this.load();
  }
  protected invalidate(): void {
    this.preview.set(null);
    this.result.set(null);
    this.request = null;
    this.key = '';
    this.confirmed = false;
  }
  protected choosePeriod(id: string): void {
    this.periodId = id;
    this.invalidate();
  }
  protected selected(id: string): boolean {
    return this.chosen().some((f) => f.id === id);
  }
  protected flatLabel(id: string): string {
    const flat = this.chosen().find((f) => f.id === id);
    return flat ? choiceLabel(flat) : 'Selected flat';
  }
  protected toggle(flat: BillingChoice): void {
    if (this.busy()) return;
    this.invalidate();
    if (this.selected(flat.id)) {
      this.chosen.update((v) => v.filter((f) => f.id !== flat.id));
      this.discounts = this.discounts.filter((d) => d.flatId !== flat.id);
    } else if (this.chosen().length < 50) this.chosen.update((v) => [...v, flat]);
    else this.error.set('Select at most 50 flats per batch.');
  }
  protected async load(page = 1): Promise<void> {
    const n = ++this.sequence;
    this.loading.set(true);
    try {
      const result = await this.api.list<BillingChoice>('flats', page, this.q);
      if (n === this.sequence) {
        this.flats.set(result);
        this.error.set(null);
      }
    } catch (e) {
      if (n === this.sequence) {
        this.flats.set(null);
        this.error.set(billingError(e));
      }
    } finally {
      if (n === this.sequence) this.loading.set(false);
    }
  }
  protected addDiscount(valid: boolean): void {
    if (!valid || !this.chosen().some((f) => f.id === this.discountFlat)) {
      this.error.set('Choose a selected flat, amount and a reason of at least five characters.');
      return;
    }
    this.invalidate();
    this.discounts = [
      ...this.discounts.filter((d) => d.flatId !== this.discountFlat),
      {
        flatId: this.discountFlat,
        kind: this.discountKind,
        value: this.discountValue,
        reason: this.discountReason,
      },
    ];
    this.error.set(null);
  }
  protected removeDiscount(id: string): void {
    this.discounts = this.discounts.filter((d) => d.flatId !== id);
    this.invalidate();
  }
  protected async review(): Promise<void> {
    if (this.busy()) return;
    if (!this.periodId || !this.chosen().length) {
      this.error.set('Choose a period and at least one flat.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.invalidate();
    try {
      const request = {
        periodId: this.periodId,
        flatIds: this.chosen().map((f) => f.id),
        discounts: [...this.discounts],
      };
      const preview = await this.api.post<BillingPreview>('preview', request);
      this.request = request;
      this.key = crypto.randomUUID();
      this.preview.set(preview);
    } catch (e) {
      this.error.set(billingError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected async issue(): Promise<void> {
    const preview = this.preview();
    if (!preview || !this.request || !this.confirmed || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.result.set(
        await this.api.post('generate', {
          ...this.request,
          previewHash: preview.previewHash,
          idempotencyKey: this.key,
        }),
      );
      this.preview.set(null);
      this.confirmed = false;
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 409) this.invalidate();
      this.error.set(billingError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
