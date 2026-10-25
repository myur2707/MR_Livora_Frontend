import { Component, input } from '@angular/core';

@Component({
  selector: 'se-card',
  // `title` is an input here; clear the host attribute so browsers don't show it as a tooltip.
  host: { class: 'card', '[attr.title]': 'null' },
  template:
    '@if (title()) { <div class="card-heading"><h2>{{ title() }}</h2>@if (description()) { <p>{{ description() }}</p> }</div> }<ng-content />',
})
export class CardComponent {
  readonly title = input('');
  readonly description = input('');
}
