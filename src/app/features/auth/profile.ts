import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, authErrorMessage } from '../../core/auth';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { ControlDirective, FieldComponent, FormNoticeComponent } from '../../shared/field';
import { ToastService } from '../../shared/toast';
import { DialogComponent } from '../../shared/dialog';

@Component({
  selector: 'se-account-profile',
  imports: [
    ReactiveFormsModule,
    ButtonDirective,
    CardComponent,
    ControlDirective,
    FieldComponent,
    FormNoticeComponent,
    DialogComponent,
  ],
  styles: `
    :host {
      display: block;
    }
    .page-heading {
      margin-bottom: 0.75rem;
    }
    se-card {
      padding: 1rem 1.25rem 1.125rem;
      margin-bottom: 0;
    }
    .profile-card-heading {
      align-items: baseline;
      display: flex;
      gap: 0.75rem;
      justify-content: space-between;
      margin-bottom: 0.875rem;
    }
    .profile-card-heading h2 {
      white-space: nowrap;
    }
    .profile-card-heading p {
      color: var(--muted);
      text-align: right;
    }
    form {
      max-width: none;
    }
    .profile-grid {
      display: grid;
      gap: 0.875rem;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .profile-grid se-field {
      margin-bottom: 0;
    }
    .profile-grid .form-control {
      min-height: var(--control-height);
      padding-block: 7px;
    }
    .profile-note {
      color: var(--muted);
      margin-top: 0.75rem;
    }
    .profile-actions {
      align-items: center;
      display: flex;
      gap: 1rem;
      margin-top: 0.75rem;
    }
    .password-form {
      display: grid;
      gap: 0.75rem;
    }
    .password-form se-field {
      margin-bottom: 0;
    }
    @media (max-width: 900px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
      .profile-card-heading {
        align-items: start;
        flex-direction: column;
        gap: 0.25rem;
      }
      .profile-card-heading p {
        text-align: left;
      }
      .profile-actions {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `,
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">MY ACCOUNT</p>
        <h1 tabindex="-1">My profile</h1>
        <p>Update the contact details used for your Mr. Livora account.</p>
      </div>
    </header>
    <se-form-notice [message]="error()" />
    <se-card>
      @if (loading()) {
        <p role="status">Loading your profile…</p>
      } @else {
        <div class="profile-card-heading">
          <h2>Profile details</h2>
          <p>Used for your account in every workspace.</p>
        </div>
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div class="profile-grid">
            <se-field controlId="profile-email" label="Account email">
              <input seInput id="profile-email" type="email" [value]="email()" disabled />
            </se-field>
            <se-field
              controlId="profile-name"
              label="Display name"
              [required]="true"
              [error]="nameError()"
            >
              <input
                seInput
                id="profile-name"
                formControlName="displayName"
                maxlength="160"
                autocomplete="name"
              />
            </se-field>
            <se-field controlId="profile-phone" label="Contact phone" [error]="phoneError()">
              <input
                seInput
                id="profile-phone"
                formControlName="contactPhone"
                maxlength="32"
                autocomplete="tel"
              />
            </se-field>
          </div>
          <p class="profile-note">Email and verified society details are managed separately.</p>
          <div class="profile-actions">
            <button seButton type="submit" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Save changes' }}
            </button>
            <button seButton variant="secondary" type="button" (click)="openPasswordDialog()">
              Change password
            </button>
          </div>
        </form>
      }
    </se-card>
    <se-dialog title="Change password" [open]="passwordDialog()" (closed)="closePasswordDialog()">
      <p class="dialog-description">
        Choose a new password with at least 15 characters. Other signed-in sessions will be ended.
      </p>
      <se-form-notice [message]="passwordError()" />
      <form
        class="password-form"
        [formGroup]="passwordForm"
        (ngSubmit)="changePassword()"
        novalidate
      >
        <se-field
          controlId="new-password"
          label="New password"
          [required]="true"
          [error]="passwordFieldError('password')"
        >
          <input
            seInput
            id="new-password"
            type="password"
            formControlName="password"
            autocomplete="new-password"
            maxlength="128"
          />
        </se-field>
        <se-field
          controlId="confirm-password"
          label="Confirm new password"
          [required]="true"
          [error]="passwordFieldError('confirmation')"
        >
          <input
            seInput
            id="confirm-password"
            type="password"
            formControlName="confirmation"
            autocomplete="new-password"
            maxlength="128"
          />
        </se-field>
        <div class="button-row">
          <button seButton type="submit" [disabled]="changingPassword()">
            {{ changingPassword() ? 'Changing…' : 'Change password' }}
          </button>
          <button seButton variant="ghost" type="button" (click)="closePasswordDialog()">
            Cancel
          </button>
        </div>
      </form>
    </se-dialog>
  `,
})
export class AccountProfilePage {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly passwordDialog = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly email = signal('');
  protected readonly form = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [(control) => Validators.required(control), Validators.maxLength(160)],
    }),
    contactPhone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^\+?[0-9][0-9 ()-]{5,30}$/)],
    }),
  });
  protected readonly passwordForm = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        (control) => Validators.required(control),
        Validators.minLength(15),
        Validators.maxLength(128),
      ],
    }),
    confirmation: new FormControl('', {
      nonNullable: true,
      validators: [(control) => Validators.required(control), Validators.maxLength(128)],
    }),
  });

  constructor() {
    void this.load();
  }

  protected nameError(): string | null {
    const control = this.form.controls.displayName;
    return control.touched && control.invalid
      ? 'Enter a display name of up to 160 characters.'
      : null;
  }

  protected phoneError(): string | null {
    const control = this.form.controls.contactPhone;
    return control.touched && control.invalid ? 'Enter a valid contact phone number.' : null;
  }

  protected passwordFieldError(name: 'password' | 'confirmation'): string | null {
    const control = this.passwordForm.controls[name];
    if (!control.touched || control.valid) return null;
    return name === 'password'
      ? 'Enter a password between 15 and 128 characters.'
      : 'Confirm your new password.';
  }

  protected openPasswordDialog(): void {
    this.passwordError.set(null);
    this.passwordDialog.set(true);
  }

  protected closePasswordDialog(): void {
    if (this.changingPassword()) return;
    this.passwordDialog.set(false);
    this.passwordForm.reset();
    this.passwordError.set(null);
  }

  protected async changePassword(): Promise<void> {
    this.passwordError.set(null);
    this.passwordForm.markAllAsTouched();
    const { password, confirmation } = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid) return;
    if (password !== confirmation) {
      this.passwordError.set('The passwords do not match.');
      return;
    }
    this.changingPassword.set(true);
    try {
      await this.auth.changePassword(password);
      this.passwordDialog.set(false);
      this.passwordForm.reset();
      this.toast.show('Password changed successfully.', 'success');
    } catch (error) {
      this.passwordError.set(authErrorMessage(error));
    } finally {
      this.changingPassword.set(false);
    }
  }

  protected async save(): Promise<void> {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const profile = await this.auth.updateProfile({
        displayName: this.form.controls.displayName.value.trim(),
        contactPhone: this.form.controls.contactPhone.value.trim() || null,
      });
      this.form.reset({
        displayName: profile.displayName,
        contactPhone: profile.contactPhone ?? '',
      });
      this.toast.show('Profile updated successfully.', 'success');
    } catch (error) {
      this.error.set(authErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      const profile = await this.auth.profile();
      this.email.set(profile.email);
      this.form.reset({
        displayName: profile.displayName,
        contactPhone: profile.contactPhone ?? '',
      });
    } catch (error) {
      this.error.set(authErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
