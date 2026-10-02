import { Component, inject, input, output, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PropertyApi, propertyError } from '../../core/property';
import type { DirectoryRow, DirectoryKind } from '../../core/property';
import type { Page } from '../../core/onboarding';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { ButtonDirective } from '../../shared/button';
import { PaginationComponent } from '../../shared/pagination';
import { UiIdService } from '../../core/ui-id';
@Component({
  selector: 'se-resource-picker',
  imports: [
    FormsModule,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    ButtonDirective,
    PaginationComponent,
  ],
  template: ` <div class="resource-picker">
    <se-field [controlId]="searchId" [label]="'Search ' + label()"
      ><input
        seInput
        [(ngModel)]="query"
        maxlength="100"
        (keydown.enter)="$event.preventDefault(); load()"
    /></se-field>
    <button seButton variant="secondary" type="button" (click)="load()" [disabled]="loading()">
      Search
    </button>
    <se-form-notice [message]="error()" />
    @if (result(); as data) {
      <se-field [controlId]="selectId" [label]="label()" [required]="true"
        ><select seSelect [value]="value()" (change)="choose($event)">
          <option value="">Select from this page</option>
          @if (value() && !hasSelection()) {
            <option [value]="value()">Current selection (retained)</option>
          }
          @for (row of data.items; track row.id) {
            <option [value]="row.id">{{ name(row) }}</option>
          }
        </select></se-field
      >
      <p class="field-hint">
        {{
          value() ? selectionLabel() : 'Choose an active record. Search or change pages to find it.'
        }}
      </p>
      <se-pagination
        [total]="data.total"
        [page]="data.page"
        [pageSize]="data.pageSize"
        (pageSelected)="load($event)"
      />
    }
  </div>`,
})
export class ResourcePicker implements OnInit {
  readonly kind = input.required<DirectoryKind>();
  readonly label = input.required<string>();
  readonly value = input('');
  readonly selected = output<string>();
  private readonly api = inject(PropertyApi);
  protected readonly searchId = inject(UiIdService).next('picker-search');
  protected readonly selectId = inject(UiIdService).next('picker-select');
  protected readonly result = signal<Page<DirectoryRow> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected query = '';
  private sequence = 0;
  ngOnInit(): void {
    void this.load();
  }
  protected async load(page = 1): Promise<void> {
    const n = ++this.sequence;
    this.loading.set(true);
    try {
      const result = await this.api.list<DirectoryRow>(this.kind(), {
        q: this.query,
        page,
        pageSize: 20,
      });
      if (n === this.sequence) {
        this.result.set(result);
        this.error.set(null);
      }
    } catch (e) {
      if (n === this.sequence) this.error.set(propertyError(e));
    } finally {
      if (n === this.sequence) this.loading.set(false);
    }
  }
  protected hasSelection(): boolean {
    return !!this.result()?.items.some((row) => row.id === this.value());
  }
  protected selectionLabel(): string {
    const row = this.result()?.items.find((row) => row.id === this.value());
    return row
      ? 'Selected: ' + this.name(row)
      : 'Current selection is retained. Choose another result to change it.';
  }
  protected name(row: DirectoryRow): string {
    return 'displayName' in row
      ? row.displayName + ' · ' + (row.reference ?? row.id)
      : 'code' in row
        ? row.code + ' · ' + row.name
        : row.buildingCode + ' / ' + row.flatNumber;
  }
  protected choose(event: Event): void {
    if (event.target instanceof HTMLSelectElement) this.selected.emit(event.target.value);
  }
}
