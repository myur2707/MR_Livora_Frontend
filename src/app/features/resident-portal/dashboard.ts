import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResidentPortalApi, residentMoney } from '../../core/resident-portal';
import type { ResidentDashboard } from '../../core/resident-portal';
import { AuthState } from '../../core/auth-state';
import { CardComponent } from '../../shared/card';
import { ButtonDirective } from '../../shared/button';
import { FormNoticeComponent } from '../../shared/field';
import { IconComponent } from '../../shared/icon';
import { VisibleNavigation } from '../../layout/visible-navigation';
import { ResidentView } from './view';
import { LabelPipe } from '../../shared/label';
@Component({
  selector: 'se-resident-dashboard',
  imports: [
    LabelPipe,
    RouterLink,
    CardComponent,
    ButtonDirective,
    FormNoticeComponent,
    IconComponent,
  ],
  templateUrl: './dashboard.html',
})
export class ResidentDashboardPage {
  protected readonly auth = inject(AuthState);
  private readonly api = inject(ResidentPortalApi);
  protected readonly view = new ResidentView<ResidentDashboard>();
  protected readonly money = residentMoney;
  // Mirrors the sidebar's "My living" menu (minus this page) so shortcuts and navigation never drift.
  private readonly navigation = inject(VisibleNavigation);
  protected readonly shortcuts = computed(() =>
    this.navigation
      .items()
      .filter(
        (item) =>
          (item.group === 'My living' && item.path !== '/society/resident/dashboard') ||
          item.path === '/profile',
      ),
  );
  constructor() {
    void this.refresh();
  }
  protected refresh(): Promise<void> {
    return this.view.load(() => this.api.get<ResidentDashboard>('dashboard'));
  }
}
