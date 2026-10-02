import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DOCUMENT } from '@angular/common';
import { AuthService, authErrorMessage, safeReturnUrl } from '../../core/auth';
import { ThemeService } from '../../core/theme';
import { ButtonDirective } from '../../shared/button';
import { IconComponent } from '../../shared/icon';
import { ControlDirective, FieldComponent, FormNoticeComponent } from '../../shared/field';
import { fieldError } from '../../shared/form-errors';

@Component({
  selector: 'se-auth-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonDirective,
    IconComponent,
    ControlDirective,
    FieldComponent,
    FormNoticeComponent,
  ],
  templateUrl: './auth-page.html',
})
export class AuthPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  protected readonly theme = inject(ThemeService);
  protected readonly mode: string = String(this.route.snapshot.data['mode']);
  protected readonly title =
    this.mode === 'login'
      ? 'Welcome home'
      : this.mode === 'forgot'
        ? 'A fresh start'
        : 'Set a new password';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators:
        this.mode !== 'reset'
          ? [
              (control) => Validators.required(control),
              (control) => Validators.email(control),
              Validators.maxLength(254),
            ]
          : [],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators:
        this.mode !== 'forgot'
          ? [
              (control) => Validators.required(control),
              Validators.minLength(this.mode === 'reset' ? 15 : 1),
              Validators.maxLength(128),
            ]
          : [],
    }),
    confirmation: new FormControl('', {
      nonNullable: true,
      validators: this.mode === 'reset' ? [(control) => Validators.required(control)] : [],
    }),
  });
  private token = '';
  constructor() {
    if (this.mode === 'reset') {
      const fragment = this.route.snapshot.fragment ?? '';
      const value = new URLSearchParams(fragment).get('token') ?? '';
      if (/^[a-zA-Z0-9_-]{43}$/.test(value)) this.token = value;
      // Remove the bearer token from address/history immediately; retain it only in this component.
      this.document.defaultView?.history.replaceState(null, '', '/reset-password');
      if (!this.token) this.error.set('This reset link is invalid or expired. Request a new link.');
    }
  }
  protected field(name: 'email' | 'password' | 'confirmation', label: string): string | null {
    return fieldError(this.form.controls[name], label, this.submitted());
  }
  protected async submit(): Promise<void> {
    if (this.busy()) return;
    this.submitted.set(true);
    this.error.set(null);
    this.success.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password, confirmation } = this.form.getRawValue();
    if (this.mode === 'reset' && (!this.token || password !== confirmation)) {
      this.error.set(
        this.token
          ? 'Passwords must match.'
          : 'This reset link is invalid or expired. Request a new link.',
      );
      return;
    }
    this.busy.set(true);
    try {
      if (this.mode === 'login') {
        await this.auth.login(email, password);
        this.form.controls.password.reset();
        await this.router.navigateByUrl(
          safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
        );
      } else if (this.mode === 'forgot') {
        await this.auth.forgot(email);
        this.success.set('If this account is eligible, a reset link will be sent.');
      } else {
        await this.auth.reset(this.token, password);
        this.token = '';
        this.form.reset();
        this.success.set('Password updated. Sign in with your new password.');
      }
    } catch (error) {
      this.error.set(authErrorMessage(error));
      this.form.controls.password.reset();
      this.form.controls.confirmation.reset();
    } finally {
      this.busy.set(false);
    }
  }
}
