import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonDirective } from '../../shared/button';
import { ControlDirective, FieldComponent } from '../../shared/field';
import { IconComponent } from '../../shared/icon';
import { RevealDirective } from '../../shared/reveal';
import { describePage } from './page-meta';
import { CONTACT } from './public-content';

type ContactField = 'name' | 'email' | 'phone' | 'society' | 'message';

const LIMITS = { name: 120, email: 254, phone: 20, society: 160, message: 2000 } as const;
const MESSAGE_MIN = 10;
/* Digits with optional +, spaces, dashes and brackets. */
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/;

/**
 * There is no contact API, so the form only prepares an email in the visitor's own mail app.
 * Nothing is sent or stored by Mr. Livora.
 */
@Component({
  selector: 'se-public-contact',
  imports: [
    ReactiveFormsModule,
    ButtonDirective,
    FieldComponent,
    ControlDirective,
    IconComponent,
    RevealDirective,
  ],
  templateUrl: './contact.html',
})
export class PublicContactComponent {
  protected readonly contact = CONTACT;
  protected readonly limits = LIMITS;
  protected readonly prepared = signal(false);
  private readonly view = inject(DOCUMENT).defaultView;
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [(control) => Validators.required(control), Validators.maxLength(LIMITS.name)]],
    email: [
      '',
      [
        (control) => Validators.required(control),
        (control) => Validators.email(control),
        Validators.maxLength(LIMITS.email),
      ],
    ],
    phone: ['', [Validators.pattern(PHONE_PATTERN)]],
    society: ['', [Validators.maxLength(LIMITS.society)]],
    message: [
      '',
      [
        (control) => Validators.required(control),
        Validators.minLength(MESSAGE_MIN),
        Validators.maxLength(LIMITS.message),
      ],
    ],
  });

  constructor() {
    describePage(
      'Contact Mr. Livora by phone, email, Instagram or Facebook to learn how smart society management can work for your community.',
    );
  }

  protected error(field: ContactField): string | null {
    const control = this.form.controls[field];
    if (!control.touched || control.valid) return null;
    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('pattern')) return 'Enter a valid phone number.';
    if (control.hasError('minlength')) return `Write at least ${MESSAGE_MIN} characters.`;
    return 'This entry is too long.';
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.view?.open(this.mailtoLink(), '_self');
    this.prepared.set(true);
  }

  private mailtoLink(): string {
    const { name, email, phone, society, message } = this.form.getRawValue();
    const details = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone && `Phone: ${phone}`,
      society && `Society: ${society}`,
    ].filter(Boolean);
    const body = `${message}\n\n${details.join('\n')}`;
    const subject = `Mr. Livora enquiry from ${name}`;
    return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}
