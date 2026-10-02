import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'se-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<Theme>('light');
  readonly theme = this.current.asReadonly();

  initialize(): void {
    const preset = this.document.documentElement.dataset['theme'];
    this.apply(preset === 'dark' ? 'dark' : 'light');
  }

  toggle(): void {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.apply(next);
    try {
      this.document.defaultView?.localStorage.setItem(THEME_KEY, next);
    } catch (error) {
      if (
        !(error instanceof DOMException) ||
        !['SecurityError', 'QuotaExceededError'].includes(error.name)
      )
        throw error;
      // Theme persistence is optional in browsers that deny storage.
    }
  }

  private apply(theme: Theme): void {
    this.current.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#162923' : '#214d3d');
  }
}
