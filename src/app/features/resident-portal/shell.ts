import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthState } from '../../core/auth-state';
import { ButtonDirective } from '../../shared/button';
@Component({
  selector: 'se-resident-shell',
  imports: [RouterOutlet, RouterLink, ButtonDirective],
  template: ` @if (auth.identity()?.activeSociety) {
      <router-outlet />
    } @else {
      <h1 tabindex="-1">Community access unavailable</h1>
      <p>Your session or community access changed.</p>
      <a seButton routerLink="/login">Sign in again</a
      ><a seButton variant="secondary" routerLink="/workspace">Choose a workspace</a>
    }`,
})
export class ResidentShell {
  protected readonly auth = inject(AuthState);
}
