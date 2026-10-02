import { Directive, input } from '@angular/core';

@Directive({
  selector: 'button[seButton], a[seButton]',
  host: { class: 'button', '[attr.data-variant]': 'variant()' },
})
export class ButtonDirective {
  readonly variant = input<'primary' | 'secondary' | 'ghost' | 'danger'>('primary');
}
