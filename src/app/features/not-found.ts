import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../shared/button';
import { CardComponent } from '../shared/card';
import { StateComponent } from '../shared/state';

@Component({
  selector: 'se-not-found',
  imports: [RouterLink, ButtonDirective, CardComponent, StateComponent],
  template:
    '<div class="page-heading"><div><p class="eyebrow">404</p><h1 tabindex="-1">Page not found</h1><p>Let’s get you back to familiar ground.</p></div></div><se-card><se-state title="This address has no home" message="The page may have moved, or the link may be incomplete."><a seButton routerLink="/platform/dashboard">Return to overview</a></se-state></se-card>',
})
export class NotFoundComponent {}
