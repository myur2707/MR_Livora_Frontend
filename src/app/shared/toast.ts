import { Component, Injectable, inject, signal } from '@angular/core';
import { ButtonDirective } from './button';
import { IconComponent } from './icon';

interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  private readonly items = signal<Toast[]>([]);
  readonly toasts = this.items.asReadonly();
  show(message: string, tone: Toast['tone'] = 'info'): void {
    const id = ++this.sequence;
    this.items.set([{ id, message, tone }]);
    setTimeout(() => this.dismiss(id), tone === 'error' ? 7000 : 4500);
  }
  dismiss(id: number): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }
}

@Component({
  selector: 'se-toast-region',
  imports: [ButtonDirective, IconComponent],
  template: `<div class="toast-region" aria-live="polite" aria-atomic="false">
    @for (toast of service.toasts(); track toast.id) {
      <div
        class="toast"
        [attr.data-tone]="toast.tone"
        [attr.role]="toast.tone === 'error' ? 'alert' : 'status'"
      >
        <se-icon [name]="toast.tone === 'success' ? 'check' : 'info'" />
        <p>{{ toast.message }}</p>
        <button
          seButton
          variant="ghost"
          type="button"
          aria-label="Dismiss notification"
          (click)="service.dismiss(toast.id)"
        >
          <se-icon name="close" />
        </button>
      </div>
    }
  </div>`,
})
export class ToastRegionComponent {
  protected readonly service = inject(ToastService);
}
