import { Component, Directive, computed, effect, inject, input } from '@angular/core';
import { ToastService } from './toast';

@Component({
  selector: 'se-field',
  host: { class: 'field' },
  template: `<label [for]="controlId()"
      >{{ label() }}
      @if (required()) {
        <span aria-hidden="true">*</span><span class="sr-only"> (required)</span>
      }
    </label>
    <ng-content />
    @if (error()) {
      <p class="field-error" [id]="descriptionId()" role="alert">{{ error() }}</p>
    } @else if (hint()) {
      <p class="field-hint" [id]="descriptionId()">{{ hint() }}</p>
    }`,
})
export class FieldComponent {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly error = input<string | null>(null);
  readonly required = input(false);
  readonly descriptionId = computed(() => this.controlId() + '-description');
}

@Directive({
  selector: 'input[seInput], textarea[seInput], select[seSelect]',
  host: {
    class: 'form-control',
    '[attr.id]': 'field?.controlId()',
    '[attr.aria-describedby]':
      'field && (field.error() || field.hint()) ? field.descriptionId() : null',
    '[attr.aria-invalid]': 'field?.error() ? "true" : null',
  },
})
export class ControlDirective {
  protected readonly field = inject(FieldComponent, { optional: true });
}

@Component({
  selector: 'se-form-notice',
  template: '',
})
export class FormNoticeComponent {
  readonly title = input('Please check your request');
  readonly message = input<string | null>(null);
  private readonly toast = inject(ToastService);
  private previous: string | null = null;

  constructor() {
    effect(() => {
      const message = this.message();
      if (message && message !== this.previous) this.toast.show(message, 'error');
      this.previous = message;
    });
  }
}
