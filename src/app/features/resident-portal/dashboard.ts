import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResidentPortalApi, residentMoney } from '../../core/resident-portal';
import type { ResidentDashboard } from '../../core/resident-portal';
import { AuthState } from '../../core/auth-state';
import { CardComponent } from '../../shared/card';
import { ButtonDirective } from '../../shared/button';
import { FormNoticeComponent } from '../../shared/field';
import { ResidentView } from './view';
@Component({
  selector: 'se-resident-dashboard',
  imports: [RouterLink, CardComponent, ButtonDirective, FormNoticeComponent],
  templateUrl: './dashboard.html',
})
export class ResidentDashboardPage {
  protected readonly auth = inject(AuthState);
  private readonly api = inject(ResidentPortalApi);
  protected readonly view = new ResidentView<ResidentDashboard>();
  protected readonly money = residentMoney;
  constructor() {
    void this.refresh();
  }
  protected refresh(): Promise<void> {
    return this.view.load(() => this.api.get<ResidentDashboard>('dashboard'));
  }
}
