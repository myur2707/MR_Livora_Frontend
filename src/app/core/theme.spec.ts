import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_KEY, ThemeService } from './theme';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem(THEME_KEY);
  document.documentElement.dataset['theme'] = 'light';
});

describe('theme preferences', () => {
  it('uses the bootstrapped preference and only persists the theme', () => {
    document.documentElement.dataset['theme'] = 'dark';
    const service = TestBed.inject(ThemeService);
    service.initialize();
    expect(service.theme()).toBe('dark');
    service.toggle();
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
  it('still switches when browser preference storage is denied', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Unavailable', 'SecurityError');
    });
    const service = TestBed.inject(ThemeService);
    service.initialize();
    expect(() => service.toggle()).not.toThrow();
    expect(service.theme()).toBe('dark');
  });
});
