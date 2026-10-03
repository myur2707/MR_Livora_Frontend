import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthState } from '../../core/auth-state';
import { ReportsApi } from '../../core/reports';
import type { CommitteeSummary } from '../../core/reports';
import { ResidentView as PrivateView } from '../resident-portal/view';
import { CardComponent } from '../../shared/card';
import { FormNoticeComponent } from '../../shared/field';
@Component({
  selector: 'se-committee-dashboard',
  imports: [DatePipe, RouterLink, CardComponent, FormNoticeComponent],
  templateUrl: './dashboard.html',
})
export class CommitteeDashboardPage {
  protected readonly auth = inject(AuthState);
  private readonly api = inject(ReportsApi);
  protected readonly summary = new PrivateView<CommitteeSummary>();
  constructor() {
    void this.summary.load(() => this.api.dashboard());
  }
}
