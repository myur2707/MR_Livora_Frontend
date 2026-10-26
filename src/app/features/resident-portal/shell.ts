import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthState } from '../../core/auth-state';
import { ButtonDirective } from '../../shared/button';
import { IconComponent } from '../../shared/icon';
@Component({
  selector: 'se-resident-shell',
  imports: [RouterOutlet, RouterLink, ButtonDirective, IconComponent],
  template: ` @if (auth.identity()?.activeSociety) {
      <router-outlet />
    } @else {
      <section class="access-state" aria-labelledby="access-state-title">
        <span class="state-icon"><se-icon name="shield" /></span>
        <h1 id="access-state-title" tabindex="-1">Community access unavailable</h1>
        <p>
          Your session or community access changed. Sign in again, or choose a workspace to
          continue.
        </p>
        <div class="access-state-actions">
          <a seButton routerLink="/login">Sign in again</a
          ><a seButton variant="secondary" routerLink="/workspace">Choose a workspace</a>
        </div>
      </section>
    }`,
})
export class ResidentShell {
  protected readonly auth = inject(AuthState);
}
