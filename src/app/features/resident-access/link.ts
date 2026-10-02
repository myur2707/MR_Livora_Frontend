import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ResidentAccessApi, residentAccessError } from '../../core/resident-access';
import type { ResidentInvitationPreview } from '../../core/resident-access';
import { AuthService } from '../../core/auth';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
@Component({
  selector: 'se-resident-link',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    ButtonDirective,
    CardComponent,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
  ],
  template: ` <header class="page-heading">
      <div>
        <p class="eyebrow">YOUR COMMUNITY</p>
        <h1 tabindex="-1">{{ verify ? 'Verify your email' : 'Resident invitation' }}</h1>
      </div>
    </header>
    <se-form-notice [message]="error()" />
    @if (done()) {
      <se-card title="Completed"
        ><p role="status">
          {{
            verify
              ? 'Your email is verified. Sign in and submit a society request for committee approval.'
              : 'Your Resident membership is ready. Sign in if needed and select your community.'
          }}
        </p>
        <p>
          <a
            seButton
            routerLink="/login"
            [queryParams]="{ returnUrl: verify ? '/join-society' : '/workspace' }"
            >Sign in</a
          >
        </p>
        <p><a routerLink="/workspace">Choose workspace</a></p></se-card
      >
    } @else if (verify) {
      <se-card title="Confirm your email"
        ><p>This creates a login only. Your committee must approve society membership.</p>
        <button seButton type="button" (click)="accept()" [disabled]="busy() || !hasToken">
          Verify email
        </button></se-card
      >
    } @else if (preview(); as invitation) {
      <se-card [title]="invitation.societyName"
        ><p>{{ invitation.displayName }} · {{ invitation.email }}</p>
        <p>
          Resident access approved by the committee. Link expires
          {{ invitation.expiresAt | date: 'medium' }}.
        </p>
        @if (auth.state.identity(); as account) {
          <p>Signed in as {{ account.email }}.</p>
          @if (account.email === invitation.email) {
            <button seButton type="button" (click)="accept()" [disabled]="busy()">
              Accept resident invitation
            </button>
          } @else {
            <p>Sign in with the invited email. Reopen the email link after signing in.</p>
            <button
              seButton
              type="button"
              variant="secondary"
              (click)="signOut()"
              [disabled]="busy()"
            >
              Sign out
            </button>
          }
        } @else {
          <p>
            Already have an account? <a routerLink="/login">Sign in</a>, then reopen this email
            link. New accounts can create a password below.
          </p>
          <form #form="ngForm" class="onboarding-form" (ngSubmit)="accept(form.valid)">
            <se-field
              controlId="invite-password"
              label="Create password"
              [required]="true"
              hint="Use at least 15 characters."
              [error]="secret.touched && secret.invalid ? 'Use 15–128 characters.' : null"
              ><input
                seInput
                name="password"
                #secret="ngModel"
                [(ngModel)]="password"
                type="password"
                required
                minlength="15"
                maxlength="128"
                autocomplete="new-password"
            /></se-field>
            <se-field
              controlId="invite-confirm"
              label="Confirm password"
              [required]="true"
              [error]="repeat.touched && password !== confirmation ? 'Passwords must match.' : null"
              ><input
                seInput
                name="confirmation"
                #repeat="ngModel"
                [(ngModel)]="confirmation"
                type="password"
                required
                maxlength="128"
                autocomplete="new-password"
            /></se-field>
            <button seButton type="submit" [disabled]="busy()">Create account & accept</button>
          </form>
        }
      </se-card>
    }`,
})
export class ResidentLink implements OnInit {
  private readonly api = inject(ResidentAccessApi);
  protected readonly auth = inject(AuthService);
  protected readonly verify = inject(ActivatedRoute).snapshot.data['mode'] === 'verify';
  private token = '';
  protected hasToken = false;
  protected password = '';
  protected confirmation = '';
  protected readonly preview = signal<ResidentInvitationPreview | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  ngOnInit(): void {
    this.token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    this.hasToken = /^[a-zA-Z0-9_-]{43}$/.test(this.token);
    window.history.replaceState(null, '', window.location.pathname);
    if (!this.hasToken) {
      this.error.set('This link is missing or invalid. Reopen the link from your email.');
      return;
    }
    if (!this.verify) void this.inspect();
  }
  private async inspect(): Promise<void> {
    try {
      await this.auth.refresh();
      this.preview.set(
        await this.api.post<ResidentInvitationPreview>('/resident-access/invitations/inspect', {
          token: this.token,
        }),
      );
    } catch (e) {
      this.error.set(residentAccessError(e));
    }
  }
  protected async signOut(): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.logout();
    } catch (e) {
      this.error.set(residentAccessError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected async accept(valid: boolean | null = true): Promise<void> {
    if (this.busy() || !this.hasToken) return;
    const anonymous = !this.auth.state.identity();
    if (!this.verify && anonymous && (!valid || this.password !== this.confirmation)) {
      this.error.set('Enter matching passwords of at least 15 characters.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.post(
        this.verify ? '/resident-access/account/verify' : '/resident-access/invitations/accept',
        { token: this.token, ...(!this.verify && anonymous ? { password: this.password } : {}) },
      );
      this.token = '';
      this.hasToken = false;
      this.password = '';
      this.confirmation = '';
      this.done.set(true);
      if (!this.verify) await this.auth.refresh();
    } catch (e) {
      this.error.set(residentAccessError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
