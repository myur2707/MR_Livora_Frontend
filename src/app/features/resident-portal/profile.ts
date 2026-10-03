import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResidentPortalApi } from '../../core/resident-portal';
import type { ResidentProfile } from '../../core/resident-portal';
import { FormNoticeComponent } from '../../shared/field';
import { CardComponent } from '../../shared/card';
import { ResidentView } from './view';
@Component({
  selector: 'se-resident-profile',
  imports: [RouterLink, FormNoticeComponent, CardComponent],
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">MY ACCOUNT</p>
        <h1 tabindex="-1">My Profile</h1>
        <p>Your account and selected community contact details.</p>
      </div>
    </header>
    <se-form-notice [message]="view.error()" />
    @if (view.loading()) {
      <p role="status">Loading your profile…</p>
    }
    @if (view.value(); as data) {
      <se-card
        ><h2>{{ data.displayName }}</h2>
        <dl class="resident-totals">
          <div>
            <dt>Community</dt>
            <dd>{{ data.societyName }}</dd>
          </div>
          <div>
            <dt>Account email</dt>
            <dd>{{ data.loginEmail }}</dd>
          </div>
          <div>
            <dt>Community contact email</dt>
            <dd>{{ data.contactEmail || 'Not provided' }}</dd>
          </div>
          <div>
            <dt>Community contact phone</dt>
            <dd>{{ data.contactPhone || 'Not provided' }}</dd>
          </div>
        </dl>
        <p>Contact your committee to correct verified resident information.</p>
        <a routerLink="/forgot-password">Request a password reset</a></se-card
      >
    }
  `,
})
export class ResidentProfilePage {
  private readonly api = inject(ResidentPortalApi);
  protected readonly view = new ResidentView<ResidentProfile>();
  constructor() {
    void this.view.load(() => this.api.get<ResidentProfile>('profile'));
  }
}
