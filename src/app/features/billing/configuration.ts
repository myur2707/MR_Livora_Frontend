import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BillingApi, billingError } from '../../core/billing';
import type { BillingChoice, ChargeConfiguration } from '../../core/billing';
import type { Page } from '../../core/onboarding';
import { AuthState } from '../../core/auth-state';
import { BillingPicker } from './picker';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { TableDirective } from '../../shared/table';
import { PaginationComponent } from '../../shared/pagination';
@Component({
  selector: 'se-billing-configuration',
  imports: [
    FormsModule,
    BillingPicker,
    ButtonDirective,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    TableDirective,
    PaginationComponent,
  ],
  templateUrl: './configuration.html',
})
export class BillingConfigurationPage implements OnInit {
  private readonly api = inject(BillingApi);
  private readonly auth = inject(AuthState);
  protected readonly periods = inject(ActivatedRoute).snapshot.data['mode'] === 'periods';
  protected readonly configurations = signal<Page<ChargeConfiguration> | null>(null);
  protected readonly periodPage = signal<Page<BillingChoice> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal('');
  protected readonly busy = signal(false);
  protected readonly loading = signal(false);
  protected form: 'type' | 'configuration' | 'period' | null = null;
  protected code = '';
  protected name = '';
  protected frequency = 'MONTHLY';
  protected chargeTypeId = '';
  protected scope = 'SOCIETY';
  protected buildingId = '';
  protected flatId = '';
  protected method = 'FLAT_RATE';
  protected rate = '';
  protected effectiveFrom = '';
  protected effectiveUntil = '';
  protected eligibility = 'ALL_FLATS';
  protected enabled = true;
  protected kind = 'MONTHLY';
  protected startsOn = '';
  protected endsOn = '';
  protected dueOn = '';
  protected q = '';
  private sequence = 0;
  protected canConfigure(): boolean {
    return !!this.auth.identity()?.activeSociety?.permissions.includes('society.finance.configure');
  }
  ngOnInit(): void {
    void this.load();
  }
  protected open(form: 'type' | 'configuration' | 'period'): void {
    this.form = form;
    this.error.set(null);
    this.message.set('');
    this.code = '';
    this.name = '';
    this.chargeTypeId = '';
    this.buildingId = '';
    this.flatId = '';
  }
  protected async load(page = 1): Promise<void> {
    const n = ++this.sequence;
    this.loading.set(true);
    try {
      if (this.periods) {
        const result = await this.api.list<BillingChoice>('periods', page, this.q);
        if (n === this.sequence) this.periodPage.set(result);
      } else {
        const result = await this.api.list<ChargeConfiguration>('configurations', page, this.q);
        if (n === this.sequence) this.configurations.set(result);
      }
      if (n === this.sequence) this.error.set(null);
    } catch (e) {
      if (n === this.sequence) {
        this.configurations.set(null);
        this.periodPage.set(null);
        this.error.set(billingError(e));
      }
    } finally {
      if (n === this.sequence) this.loading.set(false);
    }
  }
  protected async save(valid: boolean): Promise<void> {
    if (!valid || this.busy()) {
      this.error.set('Complete the required fields. Amounts support at most two decimal places.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.form === 'type')
        await this.api.post('charge-types', {
          code: this.code,
          name: this.name,
          frequency: this.frequency,
        });
      else if (this.form === 'period')
        await this.api.post('periods', {
          code: this.code,
          kind: this.kind,
          startsOn: this.startsOn,
          endsOn: this.endsOn,
          dueOn: this.dueOn,
        });
      else
        await this.api.post('configurations', {
          chargeTypeId: this.chargeTypeId,
          scope: this.scope,
          ...(this.scope === 'BUILDING'
            ? { buildingId: this.buildingId }
            : this.scope === 'FLAT'
              ? { flatId: this.flatId }
              : {}),
          calculationMethod: this.method,
          rate: this.rate,
          effectiveFrom: this.effectiveFrom,
          effectiveUntil: this.effectiveUntil || null,
          eligibility: this.eligibility,
          enabled: this.enabled,
        });
      this.form = null;
      await this.load();
      this.message.set('Saved. Existing issued bills remain unchanged.');
    } catch (e) {
      this.error.set(billingError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
