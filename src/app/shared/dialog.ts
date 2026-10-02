import { Component, effect, inject, input, output, viewChild } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import type { ElementRef } from '@angular/core';
import { UiIdService } from '../core/ui-id';
import { ButtonDirective } from './button';
import { IconComponent } from './icon';

@Component({
  selector: 'se-dialog',
  imports: [ButtonDirective, IconComponent, CdkTrapFocus],
  template: `<dialog
    #dialog
    tabindex="-1"
    [class.drawer]="placement() !== 'center'"
    [attr.data-placement]="placement()"
    [attr.aria-labelledby]="titleId"
    (cancel)="onCancel($event)"
    (keydown.escape)="onCancel($event)"
    (click)="onBackdrop($event)"
  >
    <div [cdkTrapFocus]="open()">
      <header class="dialog-heading">
        <h2 [id]="titleId">{{ title() }}</h2>
        <button
          seButton
          variant="ghost"
          type="button"
          aria-label="Close dialog"
          (click)="closed.emit()"
        >
          <se-icon name="close" />
        </button>
      </header>
      <div class="dialog-content"><ng-content /></div>
    </div>
  </dialog>`,
})
export class DialogComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly placement = input<'center' | 'start' | 'end'>('center');
  readonly closed = output<void>();
  protected readonly titleId = inject(UiIdService).next('dialog');
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (this.open() && !dialog.open) dialog.showModal();
      else if (!this.open() && dialog.open) dialog.close();
    });
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }
  protected onBackdrop(event: MouseEvent): void {
    const dialog = this.dialog()?.nativeElement;
    if (!dialog || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      this.closed.emit();
  }
}
