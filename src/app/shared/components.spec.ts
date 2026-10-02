import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ControlDirective, FieldComponent, FormNoticeComponent } from './field';
import { ToastService } from './toast';
import { PaginationComponent } from './pagination';

@Component({
  selector: 'se-test-host',
  imports: [FieldComponent, ControlDirective, FormNoticeComponent],
  template:
    '<se-field controlId="test-name" label="Name" hint="A helpful hint" [error]="error()"><input seInput /></se-field><se-form-notice [message]="notice()" />',
})
class FieldsHostComponent {
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
}

describe('accessible shared components', () => {
  it('associates labels and replaces the hint with validation feedback', async () => {
    const fixture = TestBed.createComponent(FieldsHostComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input');
    expect(input?.id).toBe('test-name');
    expect(element.querySelector('label')?.htmlFor).toBe('test-name');
    expect(input?.getAttribute('aria-describedby')).toBe('test-name-description');
    fixture.componentInstance.error.set('Enter name.');
    await fixture.whenStable();
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#test-name-description')?.textContent).toContain('Enter name.');
    fixture.componentInstance.error.set(null);
    await fixture.whenStable();
    expect(input?.hasAttribute('aria-invalid')).toBe(false);
  });
  it('renders server feedback as text with an alert, never HTML', async () => {
    const fixture = TestBed.createComponent(FieldsHostComponent);
    fixture.componentInstance.notice.set('<img src=x onerror=alert(1)>');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('se-form-notice [role="alert"]')?.textContent).toContain('<img');
    expect(element.querySelector('img')).toBeNull();
  });
  it('disables pagination controls at both boundaries', async () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('total', 2);
    await fixture.whenStable();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(Array.from(buttons).every((button) => button.disabled)).toBe(true);
  });
  it('bounds notifications and dismisses only the chosen item', () => {
    const service = TestBed.inject(ToastService);
    for (const message of ['First', 'Second', 'Third', 'Fourth']) service.show(message);
    expect(service.toasts().map((toast) => toast.message)).toEqual(['Second', 'Third', 'Fourth']);
    const toast = service.toasts()[1];
    expect(toast).toBeDefined();
    if (toast) service.dismiss(toast.id);
    expect(service.toasts().map((item) => item.message)).toEqual(['Second', 'Fourth']);
  });
});
