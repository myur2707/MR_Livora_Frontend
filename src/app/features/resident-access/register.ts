import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ResidentAccessApi, residentAccessError } from '../../core/resident-access';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
@Component({
  selector: 'se-resident-register',
  imports: [
    FormsModule,
    RouterLink,
    ButtonDirective,
    CardComponent,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
  ],
  template: ` <header class="page-heading">
      <div>
        <p class="eyebrow">JOIN YOUR COMMUNITY</p>
        <h1 tabindex="-1">Create your account</h1>
        <p>Verify your email, then request membership. The committee approves society access.</p>
      </div>
    </header>
    <se-card title="Your login"
      ><se-form-notice [message]="error()" />
      @if (done()) {
        <p role="status">
          If eligible, instructions have been sent to your email. Existing accounts should sign in.
          Verification links expire after 30 minutes.
        </p>
      } @else {
        <form #form="ngForm" class="onboarding-form" (ngSubmit)="submit(form.valid)">
          <se-field
            controlId="signup-name"
            label="Your name"
            [required]="true"
            [error]="name.touched && name.invalid ? 'Enter your name.' : null"
            ><input
              seInput
              name="displayName"
              #name="ngModel"
              [(ngModel)]="displayName"
              required
              maxlength="160"
              autocomplete="name"
          /></se-field>
          <se-field
            controlId="signup-email"
            label="Email address"
            [required]="true"
            [error]="mail.touched && mail.invalid ? 'Enter a valid email address.' : null"
            ><input
              seInput
              name="email"
              #mail="ngModel"
              [(ngModel)]="email"
              type="email"
              email
              required
              maxlength="254"
              autocomplete="email"
          /></se-field>
          <se-field
            controlId="signup-password"
            label="Password"
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
            controlId="signup-confirm"
            label="Confirm password"
            [required]="true"
            [error]="repeat.touched && confirmation !== password ? 'Passwords must match.' : null"
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
          <button seButton type="submit" [disabled]="busy()">
            {{ busy() ? 'Please wait…' : 'Send verification email' }}
          </button>
        </form>
      }
      <p><a routerLink="/login" class="text-link">Sign in with an existing account</a></p></se-card
    >`,
})
export class ResidentRegister {
  private readonly api = inject(ResidentAccessApi);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected email = '';
  protected displayName = '';
  protected password = '';
  protected confirmation = '';
  protected async submit(valid: boolean | null): Promise<void> {
    if (!valid || this.password !== this.confirmation) {
      this.error.set('Enter all required fields and matching passwords of at least 15 characters.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.post('/resident-access/account/start', {
        email: this.email,
        displayName: this.displayName,
        password: this.password,
      });
      this.password = '';
      this.confirmation = '';
      this.done.set(true);
    } catch (e) {
      this.error.set(residentAccessError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
