import { Component, input, output } from '@angular/core';
import { DialogComponent } from './dialog';

@Component({
  selector: 'se-drawer',
  imports: [DialogComponent],
  template:
    '<se-dialog [open]="open()" [title]="title()" [placement]="side()" (closed)="closed.emit()"><ng-content /></se-dialog>',
})
export class DrawerComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly side = input<'start' | 'end'>('end');
  readonly closed = output<void>();
}
