import { Component, inject } from '@angular/core';
import { AuthState } from '../../core/auth-state';
import { ResidentDashboardPage } from '../resident-portal/dashboard';
import { CommitteeDashboardPage } from './dashboard';
@Component({
  selector: 'se-society-dashboard',
  imports: [ResidentDashboardPage, CommitteeDashboardPage],
  template: `@if (auth.identity()?.activeSociety) {
    @if (auth.identity()?.activeSociety?.permissions.includes('society.dashboard.manage')) {
      <se-committee-dashboard />
    } @else {
      <se-resident-dashboard />
    }
  }`,
})
export class SocietyDashboardPage {
  protected readonly auth = inject(AuthState);
}
