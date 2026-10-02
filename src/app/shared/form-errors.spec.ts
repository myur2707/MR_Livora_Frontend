import { FormControl, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { fieldError } from './form-errors';

describe('field feedback', () => {
  it('waits until touch or submission, then explains required fields', () => {
    const control = new FormControl('', (control) => Validators.required(control));
    expect(fieldError(control, 'Name')).toBeNull();
    expect(fieldError(control, 'Name', true)).toBe('Enter name.');
    control.markAsTouched();
    expect(fieldError(control, 'Name')).toBe('Enter name.');
    control.setValue('Example');
    expect(fieldError(control, 'Name')).toBeNull();
  });
  it('shows email validation without exposing internal validation data', () => {
    const control = new FormControl('invalid', (control) => Validators.email(control));
    control.markAsTouched();
    expect(fieldError(control, 'Email')).toBe('Enter a valid email address.');
    control.setErrors({ server: { stack: 'private internal details' } });
    expect(fieldError(control, 'Email')).toBe('Check email and try again.');
  });
});
