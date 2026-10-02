import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardComponent } from '../shared/card';
import { BadgeComponent } from '../shared/badge';
import { ButtonDirective } from '../shared/button';
import { StateComponent } from '../shared/state';

@Component({
  selector: 'se-workspace-placeholder',
  imports: [RouterLink, CardComponent, BadgeComponent, ButtonDirective, StateComponent],
  template: `<div class="page-heading">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h1 tabindex="-1">{{ heading }}</h1>
        <p>{{ message }}</p>
      </div>
      <se-badge>Preview</se-badge>
    </div>
    <se-card
      ><se-state
        title="A fresh start for your community"
        message="This space is taking shape. Your community information will appear here once setup is ready."
        ><a seButton variant="secondary" routerLink="/platform/dashboard"
          >Back to overview</a
        ></se-state
      ></se-card
    >`,
})
export class WorkspacePlaceholderComponent {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  protected readonly heading = String(this.data['heading']);
  protected readonly eyebrow = String(this.data['eyebrow']);
  protected readonly message = String(this.data['message']);
}
