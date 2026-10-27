import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { AbstractControl } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OnboardingApi, onboardingError } from '../../core/onboarding';
import { apiErrorMessage } from '../../core/api-error';
import type { InvitationPreview } from '../../core/onboarding';
import { AuthService } from '../../core/auth';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { StateComponent } from '../../shared/state';
import { IconComponent } from '../../shared/icon';
import { ToastService } from '../../shared/toast';
import { PasswordToggleDirective } from '../../shared/password-toggle';
const LINK_UNAVAILABLE = 'This invitation is unavailable or expired. Ask for a new invitation.';
/** A malformed or truncated link fails validation; describe it as a link problem, not a form one. */
const linkProblems: Readonly<Record<string, string>> = {
  INVITATION_INVALID: LINK_UNAVAILABLE,
  INVALID_REQUEST:
    'This invitation link is incomplete or invalid. Open the full link from your email.',
};
@Component({
  selector: 'se-committee-invitation',
  imports: [
    PasswordToggleDirective,
    RouterLink,
    ReactiveFormsModule,
    ButtonDirective,
    CardComponent,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    StateComponent,
    IconComponent,
  ],
  templateUrl: './invitation.html',
})
export class CommitteeInvitationComponent implements OnInit {
  private readonly api = inject(OnboardingApi);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private token = '';
  protected readonly preview = signal<InvitationPreview | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Why the link itself can't be used; shown as a page panel rather than a toast. */
  protected readonly linkProblem = signal<string | null>(null);
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
    let signedInEmail: string | null = null;
    try {
      signedInEmail = (await this.auth.refresh())?.email ?? null;
      const invitation = await this.api.post<InvitationPreview>('/onboarding/invitations/inspect', {
        token: this.token,
      });
      // A signed-in session may only open its own invitation; anything else leaves this page.
      if (signedInEmail !== null && signedInEmail !== invitation.email) {
        this.leave('This invitation is for another account. Sign out first to accept it.');
        return;
      }
      this.preview.set(invitation);
    } catch (error) {
      if (signedInEmail !== null) {
        this.leave('This invitation link is no longer active.');
        return;
      }
      this.linkProblem.set(apiErrorMessage(error, linkProblems) ?? onboardingError(error));
    }
  }
  private leave(message: string): void {
    this.token = '';
    this.toast.show(message, 'info');
    void this.router.navigateByUrl('/workspace', { replaceUrl: true });
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
