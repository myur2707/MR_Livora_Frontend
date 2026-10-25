import { Injectable, computed, inject } from '@angular/core';
import { AuthState } from '../core/auth-state';
import { NAVIGATION } from './navigation';

/** Single source of navigation visibility so the sidebar and bottom tab bar never disagree. */
@Injectable({ providedIn: 'root' })
export class VisibleNavigation {
  private readonly auth = inject(AuthState);
  readonly items = computed(() =>
    NAVIGATION.filter((item) =>
      // The UI library is an internal design reference for platform administrators only.
      item.path === '/ui'
        ? !!this.auth.identity()?.platformAdmin
        : item.path === '/workspace'
          ? !this.auth.identity()?.platformAdmin
          : item.path.startsWith('/platform')
            ? this.auth.identity()?.platformAdmin
            : item.path.startsWith('/society/reports/')
              ? !!this.auth
                  .identity()
                  ?.activeSociety?.permissions.includes(
                    item.path.endsWith('residents')
                      ? 'society.members.manage'
                      : 'society.finance.read',
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
                            this.auth
                              .identity()
                              ?.activeSociety?.roles.includes('COMMITTEE_ADMIN') &&
                            this.auth
                              .identity()
                              ?.activeSociety?.permissions.includes('society.members.manage')
                          ))
                      : true,
    ),
  );
}
