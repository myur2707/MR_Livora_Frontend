import type { AbstractControl } from '@angular/forms';

export function fieldError(
  control: AbstractControl,
  label: string,
  submitted = false,
): string | null {
  if (!control.invalid || (!submitted && !control.touched)) return null;
  if (control.hasError('required')) return `Enter ${label.toLowerCase()}.`;
  if (control.hasError('email')) return 'Enter a valid email address.';
  if (control.hasError('minlength')) return `${label} is too short.`;
  return `Check ${label.toLowerCase()} and try again.`;
}
