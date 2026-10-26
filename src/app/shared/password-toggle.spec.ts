import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PasswordToggleDirective } from './password-toggle';

@Component({
  imports: [PasswordToggleDirective],
  template: `<form>
    @if (shown()) {
      <input seInput type="password" value="secret value" aria-label="Password" />
    }
  </form>`,
})
class PasswordHostComponent {
  readonly shown = signal(true);
}

describe('PasswordToggleDirective', () => {
  it('reveals and hides the entered password with an accessible toggle', () => {
    const fixture = TestBed.createComponent(PasswordHostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector('input');
    const button = root.querySelector<HTMLButtonElement>('.password-field > button');
    expect(input?.type).toBe('password');
    expect(button?.type).toBe('button');
    expect(button?.getAttribute('aria-label')).toBe('Show password');
    expect(button?.getAttribute('aria-pressed')).toBe('false');
    button?.click();
    expect(input?.type).toBe('text');
    expect(input?.value).toBe('secret value');
    expect(button?.getAttribute('aria-label')).toBe('Hide password');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    button?.click();
    expect(input?.type).toBe('password');
  });
  it('removes its button when the field is removed', () => {
    const fixture = TestBed.createComponent(PasswordHostComponent);
    fixture.detectChanges();
    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.password-toggle')).toBeNull();
    expect(root.querySelector('input')).toBeNull();
  });
});
