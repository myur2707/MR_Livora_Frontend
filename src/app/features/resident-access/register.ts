import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ResidentAccessApi, residentAccessError } from '../../core/resident-access';
import { ThemeService } from '../../core/theme';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'se-resident-register',
  imports: [
    FormsModule,
    RouterLink,
    ButtonDirective,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    IconComponent,
  ],
  template: `
    <a class="skip-link" href="#registration-content">Skip to content</a>
    <div class="auth-frame auth-login registration-page">
      <header class="auth-header">
        <a class="brand" routerLink="/" aria-label="Mr. Livora home">
          <img class="brand-logo" src="/assets/brand/logo.png" alt="" width="90" height="90" />
        </a>
        <button
          seButton
          variant="ghost"
          class="icon-button"
          type="button"
          [attr.aria-label]="
            theme.theme() === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
          "
          (click)="theme.toggle()"
        >
          <se-icon [name]="theme.theme() === 'light' ? 'moon' : 'sun'" />
        </button>
      </header>
      <main id="registration-content" tabindex="-1" class="auth-main registration-main">
        <section class="auth-story registration-features" aria-labelledby="registration-benefits">
          <p class="eyebrow">ONE COMMUNITY WORKSPACE</p>
          <h2 id="registration-benefits">Everything your community needs.</h2>
          <p class="registration-intro">
            Create one secure account. Your approved community role decides what you can access.
          </p>
          <div class="registration-role-grid">
            <article class="registration-role">
              <span class="registration-role-icon"><se-icon name="user" /></span>
              <div>
                <h3>For residents</h3>
                <ul>
                  <li>View bills, payments and receipts</li>
                  <li>Read notices and raise complaints</li>
                  <li>Manage membership requests and profile</li>
                </ul>
              </div>
            </article>
            <article class="registration-role">
              <span class="registration-role-icon"><se-icon name="people" /></span>
              <div>
                <h3>For committee admins</h3>
                <ul>
                  <li>Manage properties, residents and access</li>
                  <li>Run billing, payments and reports</li>
                  <li>Publish notices and resolve complaints</li>
                </ul>
              </div>
            </article>
          </div>
          <p class="registration-assurance">
            <se-icon name="shield" /> Access starts after verification and approval.
          </p>
        </section>
        <section class="auth-card registration-card" aria-labelledby="registration-title">
          <div class="auth-card-heading">
            <span class="guide-icon"><se-icon name="userPlus" /></span>
            <h1 id="registration-title" tabindex="-1">Create your account</h1>
          </div>
          <p class="auth-subtitle">
            Verify your email, then request membership. Your committee approves community access.
          </p>
          <se-form-notice [message]="error()" />
          @if (done()) {
            <section class="registration-success" role="status" aria-labelledby="signup-next-step">
              <span class="registration-success-icon"><se-icon name="check" /></span>
              <p class="eyebrow">Email instructions ready</p>
              <h2 id="signup-next-step">Check your inbox</h2>
              <p class="registration-success-intro">
                If this email is eligible, we have sent the next step. For your privacy, this
                message is the same for new and existing accounts.
              </p>
              <ol class="registration-next-steps">
                <li>
                  <span>1</span>
                  <div>
                    <strong>Open the email</strong
                    ><small>Look for a message from Mr. Livora.</small>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>Follow the secure link</strong
                    ><small>New-account links expire after 30 minutes.</small>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>Continue to your community</strong
                    ><small>Existing users can sign in and request membership.</small>
                  </div>
                </li>
              </ol>
              <p class="registration-security-note">
                <se-icon name="shield" /> Never share your password or verification link.
              </p>
            </section>
          } @else {
            <form
              #form="ngForm"
              class="auth-form registration-form"
              (ngSubmit)="submit(form.valid)"
            >
              <se-field
                controlId="signup-name"
                label="Your name"
                [required]="true"
                [error]="name.touched && name.invalid ? 'Enter your name.' : null"
              >
                <input
                  seInput
                  name="displayName"
                  #name="ngModel"
                  [(ngModel)]="displayName"
                  required
                  maxlength="160"
                  autocomplete="name"
                />
              </se-field>
              <se-field
                controlId="signup-email"
                label="Email address"
                [required]="true"
                [error]="mail.touched && mail.invalid ? 'Enter a valid email address.' : null"
              >
                <input
                  seInput
                  name="email"
                  #mail="ngModel"
                  [(ngModel)]="email"
                  type="email"
                  email
                  required
                  maxlength="254"
                  autocomplete="email"
                />
              </se-field>
              <se-field
                controlId="signup-password"
                label="Password"
                [required]="true"
                hint="Use at least 15 characters."
                [error]="secret.touched && secret.invalid ? 'Use 15–128 characters.' : null"
              >
                <input
                  seInput
                  name="password"
                  #secret="ngModel"
                  [(ngModel)]="password"
                  type="password"
                  required
                  minlength="15"
                  maxlength="128"
                  autocomplete="new-password"
                />
              </se-field>
              <se-field
                controlId="signup-confirm"
                label="Confirm password"
                [required]="true"
                [error]="
                  repeat.touched && confirmation !== password ? 'Passwords must match.' : null
                "
              >
                <input
                  seInput
                  name="confirmation"
                  #repeat="ngModel"
                  [(ngModel)]="confirmation"
                  type="password"
                  required
                  maxlength="128"
                  autocomplete="new-password"
                />
              </se-field>
              <button seButton type="submit" [disabled]="busy()">
                {{ busy() ? 'Please wait…' : 'Send verification email' }}
              </button>
            </form>
          }
          <div class="auth-account-link">
            <span>Already registered?</span><a routerLink="/login" class="text-link">Sign in</a>
          </div>
          <div class="auth-note">
            <se-icon name="shield" /><span>Your community, with care.</span>
          </div>
        </section>
      </main>
      <footer class="auth-footer">Live in a Better Aura</footer>
    </div>
  `,
})
export class ResidentRegister {
  private readonly api = inject(ResidentAccessApi);
  protected readonly theme = inject(ThemeService);
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
    } catch (error) {
      this.error.set(residentAccessError(error));
    } finally {
      this.busy.set(false);
    }
  }
}
