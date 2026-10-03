import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../shared/icon';
import { NAVIGATION } from './navigation';
import { AuthState } from '../core/auth-state';

@Component({
  selector: 'se-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  host: { '[class.is-collapsed]': 'collapsed()', class: 'sidebar' },
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  readonly collapsed = input(false);
  readonly navigated = output<void>();
  private readonly auth = inject(AuthState);
  protected readonly navigation = computed(() =>
    NAVIGATION.filter((item) =>
      item.path.startsWith('/platform')
        ? this.auth.identity()?.platformAdmin
        : item.path.startsWith('/society/reports/')
          ? !!this.auth
              .identity()
              ?.activeSociety?.permissions.includes(
                item.path.endsWith('residents') ? 'society.members.manage' : 'society.finance.read',
              )
          : item.path.startsWith('/society/community/')
            ? !!this.auth
                .identity()
                ?.activeSociety?.permissions.includes(
                  item.path.endsWith('notices')
                    ? 'society.notices.manage'
                    : 'society.complaints.manage',
                )
            : item.path.startsWith('/society/resident/')
              ? !!this.auth
                  .identity()
                  ?.activeSociety?.permissions.includes('society.dashboard.read')
              : item.path.startsWith('/society/billing')
                ? !!this.auth
                    .identity()
                    ?.activeSociety?.permissions.includes('society.finance.read')
                : item.path.startsWith('/society')
                  ? !!this.auth.identity()?.activeSociety &&
                    (item.path === '/society/dashboard' ||
                      !!(
                        this.auth.identity()?.activeSociety?.roles.includes('COMMITTEE_ADMIN') &&
                        this.auth
                          .identity()
                          ?.activeSociety?.permissions.includes('society.members.manage')
                      ))
                  : true,
    ),
  );
  protected readonly groups = computed(() => [
    ...new Set(this.navigation().map((item) => item.group)),
  ]);
}
