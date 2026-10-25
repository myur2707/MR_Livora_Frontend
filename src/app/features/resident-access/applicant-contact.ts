import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResidentAccessApi, residentAccessError } from '../../core/resident-access';
import type { SocietyContact } from '../../core/resident-access';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { ControlDirective, FieldComponent, FormNoticeComponent } from '../../shared/field';
import { fieldError } from '../../shared/form-errors';
import { ToastService } from '../../shared/toast';

/* Mirrors the server rule for contact phone numbers. */
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,30}$/;
const CONTACT_PATH = '/society/applicant-contact';

/** Lets the committee publish a contact that applicants see while their request is pending. */
@Component({
  selector: 'se-applicant-contact',
  imports: [
    ReactiveFormsModule,
    ButtonDirective,
    CardComponent,
    ControlDirective,
    FieldComponent,
    FormNoticeComponent,
  ],
  template: `<se-card
    class="applicant-contact-card"
    title="Contact for applicants"
    description="Shown only to people whose membership request is waiting for your review, so they can reach you if it takes a while. Leave both fields empty to hide it."
  >
    <se-form-notice [message]="error()" />
    <form class="applicant-contact-form" [formGroup]="form" (ngSubmit)="save()">
      <se-field
        controlId="applicant-contact-phone"
        label="Committee phone"
        hint="For example the society office or a committee mobile."
        [error]="problem('contactPhone')"
        ><input seInput type="tel" formControlName="contactPhone" autocomplete="tel" maxlength="32"
      /></se-field>
      <se-field
        controlId="applicant-contact-email"
        label="Committee email"
        hint="A shared committee address works best."
        [error]="problem('contactEmail')"
        ><input
          seInput
          type="email"
          formControlName="contactEmail"
          autocomplete="email"
          maxlength="254"
      /></se-field>
      <button seButton type="submit" [disabled]="busy() || loading()">
        {{ busy() ? 'Saving…' : 'Save contact' }}
      </button>
    </form>
  </se-card>`,
})
export class ApplicantContactCard implements OnInit {
  private readonly api = inject(ResidentAccessApi);
  private readonly toast = inject(ToastService);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly submitted = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    contactPhone: ['', [Validators.pattern(PHONE_PATTERN), Validators.maxLength(32)]],
    contactEmail: ['', [(control) => Validators.email(control), Validators.maxLength(254)]],
  });

  ngOnInit(): void {
    void this.load();
  }

  protected problem(field: 'contactPhone' | 'contactEmail'): string | null {
    const control = this.form.controls[field];
    if (
      field === 'contactPhone' &&
      control.hasError('pattern') &&
      (control.touched || this.submitted())
    )
      return 'Enter a phone number using digits, spaces, brackets or dashes, e.g. +91 98765 43210.';
    return fieldError(
      control,
      field === 'contactPhone' ? 'Committee phone' : 'Committee email',
      this.submitted(),
    );
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const { contactPhone, contactEmail } = this.form.getRawValue();
      const saved = await this.api.post<SocietyContact>(CONTACT_PATH, {
        contactPhone: contactPhone.trim() || null,
        contactEmail: contactEmail.trim() || null,
      });
      this.fill(saved);
      this.toast.show(
        saved.contactPhone || saved.contactEmail
          ? 'Applicants can now see this contact on their pending requests.'
          : 'The applicant contact is hidden.',
        'success',
      );
    } catch (error) {
      this.error.set(residentAccessError(error));
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      this.fill(await this.api.get<SocietyContact>(CONTACT_PATH));
    } catch (error) {
      this.error.set(residentAccessError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private fill(contact: SocietyContact): void {
    this.form.reset({
      contactPhone: contact.contactPhone ?? '',
      contactEmail: contact.contactEmail ?? '',
    });
    this.submitted.set(false);
  }
}
