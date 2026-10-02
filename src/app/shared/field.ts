import { Component, Directive, computed, inject, input } from '@angular/core';

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
  template:
    '@if (message()) { <div class="form-notice" role="alert"><strong>{{ title() }}</strong><p>{{ message() }}</p></div> }',
})
export class FormNoticeComponent {
  readonly title = input('Please check your request');
  readonly message = input<string | null>(null);
}
