import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, authErrorMessage } from '../core/auth';
import { ToastService } from '../shared/toast';
@Component({
  selector: 'se-society-switcher',
  imports: [FormsModule],
  template: `@if (auth.state.identity(); as identity) {
    @if (identity.memberships.length > 1) {
      <div class="society-switcher">
        <label for="community-switch">Community</label
        ><select
          id="community-switch"
          [ngModel]="identity.activeSociety?.societyId || ''"
          [disabled]="busy()"
          (ngModelChange)="select($event)"
        >
          <option value="">Choose community</option>
          @for (membership of identity.memberships; track membership.societyId) {
            <option [value]="membership.societyId">{{ membership.name }}</option>
          }
        </select>
      </div>
    }
  }`,
})
export class SocietySwitcher {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly busy = signal(false);
  protected async select(id: string): Promise<void> {
    const identity = this.auth.state.identity();
    if (
      this.busy() ||
      id === identity?.activeSociety?.societyId ||
      !identity?.memberships.some((m) => m.societyId === id)
    )
      return;
    this.busy.set(true);
    try {
      // Leave the private route before changing context; its requests/data are destroyed.
      await this.router.navigateByUrl('/workspace');
      await this.auth.selectSociety(id);
      await this.router.navigateByUrl('/society/resident/dashboard');
    } catch (error) {
      this.toast.show(authErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
