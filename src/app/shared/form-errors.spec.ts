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
  it('states the actual length and range limits instead of a vague "invalid"', () => {
    const password = new FormControl('short', Validators.minLength(15));
    password.markAsTouched();
    expect(fieldError(password, 'Password')).toBe(
      'Password needs at least 15 characters (5 entered).',
    );
    const note = new FormControl('x'.repeat(6), Validators.maxLength(5));
    note.markAsTouched();
    expect(fieldError(note, 'Note')).toBe('Note can be up to 5 characters.');
    const quantity = new FormControl(0, Validators.min(1));
    quantity.markAsTouched();
    expect(fieldError(quantity, 'Quantity')).toBe('Quantity must be at least 1.');
    const code = new FormControl('a b', Validators.pattern(/^\S+$/));
    code.markAsTouched();
    expect(fieldError(code, 'Code')).toBe('Check the format of code.');
  });
  it('shows email validation without exposing internal validation data', () => {
    const control = new FormControl('invalid', (control) => Validators.email(control));
    control.markAsTouched();
    expect(fieldError(control, 'Email')).toBe('Enter a valid email address.');
    control.setErrors({ server: { stack: 'private internal details' } });
    expect(fieldError(control, 'Email')).toBe('Check email and try again.');
  });
});
