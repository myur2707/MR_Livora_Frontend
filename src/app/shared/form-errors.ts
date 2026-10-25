import type { AbstractControl } from '@angular/forms';

/** Reads a numeric detail Angular attaches to a validation error, e.g. `requiredLength`. */
function detail(control: AbstractControl, error: string, key: string): number | null {
  const details: unknown = control.getError(error);
  if (typeof details !== 'object' || details === null) return null;
  const value: unknown = Reflect.get(details, key);
  return typeof value === 'number' ? value : null;
}

export function fieldError(
  control: AbstractControl,
  label: string,
  submitted = false,
): string | null {
  if (!control.invalid || (!submitted && !control.touched)) return null;
  const name = label.toLowerCase();
  if (control.hasError('required')) return `Enter ${name}.`;
  if (control.hasError('email')) return 'Enter a valid email address.';
  if (control.hasError('minlength')) {
    const needed = detail(control, 'minlength', 'requiredLength');
    const entered = detail(control, 'minlength', 'actualLength');
    return needed === null
      ? `${label} is too short.`
      : `${label} needs at least ${needed} characters` +
          (entered === null ? '.' : ` (${entered} entered).`);
  }
  if (control.hasError('maxlength')) {
    const allowed = detail(control, 'maxlength', 'requiredLength');
    return allowed === null
      ? `${label} is too long.`
      : `${label} can be up to ${allowed} characters.`;
  }
  if (control.hasError('min')) {
    const min = detail(control, 'min', 'min');
    return min === null ? `${label} is too low.` : `${label} must be at least ${min}.`;
  }
  if (control.hasError('max')) {
    const max = detail(control, 'max', 'max');
    return max === null ? `${label} is too high.` : `${label} must be ${max} or less.`;
  }
  if (control.hasError('pattern')) return `Check the format of ${name}.`;
  return `Check ${name} and try again.`;
}
