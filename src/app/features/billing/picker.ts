import { Component, inject, input, output, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BillingApi, billingError, choiceLabel } from '../../core/billing';
import type { BillingChoice } from '../../core/billing';
import type { Page } from '../../core/onboarding';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { PaginationComponent } from '../../shared/pagination';
import { UiIdService } from '../../core/ui-id';
@Component({
  selector: 'se-billing-picker',
  imports: [
    FormsModule,
    ButtonDirective,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    PaginationComponent,
  ],
  template: ` <fieldset class="billing-picker">
    <legend>{{ label() }}</legend>
    <se-field [controlId]="id" label="Search options"
      ><input
        seInput
        [(ngModel)]="q"
        [ngModelOptions]="{ standalone: true }"
        (keydown.enter)="$event.preventDefault(); load()"
    /></se-field>
    <button seButton variant="secondary" type="button" [disabled]="loading()" (click)="load()">
      Search
    </button>
    <se-form-notice [message]="error()" />
    <div class="billing-options" [attr.aria-busy]="loading()">
      @for (option of choices()?.items; track option.id) {
        <button
          seButton
          type="button"
          variant="secondary"
          [attr.aria-pressed]="selectedId === option.id"
          (click)="choose(option)"
        >
          {{ display(option) }}
        </button>
      }
      @if (choices()?.total === 0) {
        <p>No matching options.</p>
      }
    </div>
    @if (choices(); as page) {
      <se-pagination
        [total]="page.total"
        [page]="page.page"
        [pageSize]="page.pageSize"
        (pageSelected)="load($event)"
      />
    }
    @if (selectedLabel) {
      <p aria-live="polite">Selected: {{ selectedLabel }}</p>
    }
  </fieldset>`,
})
export class BillingPicker implements OnInit {
  readonly resource = input.required<string>();
  readonly label = input.required<string>();
  readonly selected = output<string>();
  private readonly api = inject(BillingApi);
  protected readonly id = inject(UiIdService).next('billing-picker');
  protected readonly choices = signal<Page<BillingChoice> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly display = choiceLabel;
  protected q = '';
  protected selectedId = '';
  protected selectedLabel = '';
  private sequence = 0;
  ngOnInit(): void {
    void this.load();
  }
  protected choose(choice: BillingChoice): void {
    this.selectedId = choice.id;
    this.selectedLabel = choiceLabel(choice);
    this.selected.emit(choice.id);
  }
  protected async load(page = 1): Promise<void> {
    const n = ++this.sequence;
    this.loading.set(true);
    try {
      const result = await this.api.list<BillingChoice>(this.resource(), page, this.q);
      if (n === this.sequence) {
        this.choices.set(result);
        this.error.set(null);
      }
    } catch (e) {
      if (n === this.sequence) {
        this.choices.set(null);
        this.error.set(billingError(e));
      }
    } finally {
      if (n === this.sequence) this.loading.set(false);
    }
  }
}
