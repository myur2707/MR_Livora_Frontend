import { Component, input } from '@angular/core';
import { IconComponent } from './icon';

@Component({
  selector: 'se-state',
  imports: [IconComponent],
  host: {
    class: 'state',
    '[attr.role]': 'kind() === "error" ? "alert" : "status"',
    '[attr.aria-busy]': 'kind() === "loading"',
  },
  template: `@if (kind() === 'loading') {
      <span class="spinner" aria-hidden="true"></span>
    } @else {
      <span class="state-icon"><se-icon [name]="kind() === 'error' ? 'info' : 'building'" /></span>
    }
    <h2>{{ title() }}</h2>
    <p>{{ message() }}</p>
    <div class="state-actions"><ng-content /></div>`,
})
export class StateComponent {
  readonly kind = input<'loading' | 'empty' | 'error'>('empty');
  readonly title = input.required<string>();
  readonly message = input('');
}
