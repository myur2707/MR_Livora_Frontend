import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonDirective } from '../../shared/button';
import { BadgeComponent } from '../../shared/badge';
import { CardComponent } from '../../shared/card';
import { ControlDirective, FieldComponent, FormNoticeComponent } from '../../shared/field';
import { fieldError } from '../../shared/form-errors';
import { TableDirective } from '../../shared/table';
import { PaginationComponent } from '../../shared/pagination';
import { DialogComponent } from '../../shared/dialog';
import { DrawerComponent } from '../../shared/drawer';
import { StateComponent } from '../../shared/state';
import { ToastService } from '../../shared/toast';

@Component({
  selector: 'se-ui-preview',
  imports: [
    ReactiveFormsModule,
    ButtonDirective,
    BadgeComponent,
    CardComponent,
    ControlDirective,
    FieldComponent,
    FormNoticeComponent,
    TableDirective,
    PaginationComponent,
    DialogComponent,
    DrawerComponent,
    StateComponent,
  ],
  templateUrl: './ui-preview.html',
})
export class UiPreviewComponent {
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [(control) => Validators.required(control)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [
        (control) => Validators.required(control),
        (control) => Validators.email(control),
      ],
    }),
    preference: new FormControl('weekly', { nonNullable: true }),
  });
  protected readonly dialogOpen = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly errors = fieldError;
  protected readonly toast = inject(ToastService);
  protected readonly inventory = [
    'Buttons',
    'Text inputs',
    'Selects',
    'Cards',
    'Badges',
    'Tables',
    'Pagination',
    'Dialog',
    'Drawer',
    'Toast',
    'Loading state',
    'Empty / error states',
  ];
  protected readonly rows = computed(() =>
    this.inventory.slice((this.page() - 1) * 5, this.page() * 5),
  );

  protected submit(): void {
    this.form.markAllAsTouched();
    this.notice.set(null);
    if (this.form.valid)
      this.toast.show('Your example form is valid. Nothing was submitted or saved.', 'success');
  }
}
