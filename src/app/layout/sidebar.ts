import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../shared/icon';
import { AuthState } from '../core/auth-state';
import { VisibleNavigation } from './visible-navigation';

@Component({
  selector: 'se-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  host: { '[class.is-collapsed]': 'collapsed()', class: 'sidebar' },
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  readonly collapsed = input(false);
  readonly signingOut = input(false);
  readonly navigated = output<void>();
  readonly logoutRequested = output<void>();
  private readonly auth = inject(AuthState);
  protected readonly signedIn = computed(() => this.auth.identity() !== null);
  protected readonly navigation = inject(VisibleNavigation).items;
  protected readonly groups = computed(() => [
    ...new Set(this.navigation().map((item) => item.group)),
  ]);
}
