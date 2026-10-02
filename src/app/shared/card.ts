import { Component, input } from '@angular/core';

@Component({
  selector: 'se-card',
  host: { class: 'card' },
  template:
    '@if (title()) { <div class="card-heading"><h2>{{ title() }}</h2>@if (description()) { <p>{{ description() }}</p> }</div> }<ng-content />',
})
export class CardComponent {
  readonly title = input('');
  readonly description = input('');
}
