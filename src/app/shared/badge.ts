import { Component, input } from '@angular/core';

@Component({
  selector: 'se-badge',
  host: { class: 'badge', '[attr.data-tone]': 'tone()' },
  template: '<ng-content />',
})
export class BadgeComponent {
  readonly tone = input<'neutral' | 'success' | 'warning'>('neutral');
}
