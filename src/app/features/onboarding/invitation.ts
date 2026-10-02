import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AbstractControl } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OnboardingApi, onboardingError } from '../../core/onboarding';
import type { InvitationPreview } from '../../core/onboarding';
import { AuthService } from '../../core/auth';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { StateComponent } from '../../shared/state';
@Component({
  selector: 'se-committee-invitation',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonDirective,
    CardComponent,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    StateComponent,
  ],
  templateUrl: './invitation.html',
})
export class CommitteeInvitationComponent implements OnInit {
  private readonly api = inject(OnboardingApi);
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private token = '';
  protected readonly preview = signal<InvitationPreview | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    password: [
      '',
      [
        (control: AbstractControl) => Validators.required(control),
        Validators.minLength(15),
        Validators.maxLength(128),
      ],
    ],
    confirmation: ['', (control: AbstractControl) => Validators.required(control)],
  });
  ngOnInit(): void {
    const parameters = new URLSearchParams(window.location.hash.slice(1));
    this.token = parameters.get('token') ?? '';
    window.history.replaceState(null, '', window.location.pathname);
    void this.inspect();
  }
  private async inspect(): Promise<void> {
    try {
      await this.auth.refresh();
      this.preview.set(
        await this.api.post<InvitationPreview>('/onboarding/invitations/inspect', {
          token: this.token,
        }),
      );
    } catch (error) {
      this.error.set(onboardingError(error));
    }
  }
  protected async signOut(): Promise<void> {
    try {
      await this.auth.logout();
    } catch (error) {
      this.error.set(onboardingError(error));
    }
  }
  protected async accept(): Promise<void> {
    const invitation = this.preview();
    if (!invitation || this.busy()) return;
    this.form.markAllAsTouched();
    if (
      !invitation.requiresLogin &&
      (this.form.invalid ||
        this.form.controls.password.value !== this.form.controls.confirmation.value)
    ) {
      this.error.set('Enter matching passwords of at least 15 characters.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.post('/onboarding/invitations/accept', {
        token: this.token,
        ...(invitation.requiresLogin ? {} : { password: this.form.controls.password.value }),
      });
      this.token = '';
      this.form.reset();
      this.done.set(true);
      await this.auth.refresh();
    } catch (error) {
      this.error.set(onboardingError(error));
    } finally {
      this.busy.set(false);
    }
  }
}
