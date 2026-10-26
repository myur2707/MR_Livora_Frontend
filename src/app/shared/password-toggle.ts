import { Directive, ElementRef, Renderer2, inject } from '@angular/core';
import type { OnDestroy, OnInit } from '@angular/core';

const SVG = 'http://www.w3.org/2000/svg';
const EYE = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z';
const EYE_OFF =
  'M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2';

/**
 * Adds a show/hide button to every password input it is imported for. The value never leaves
 * the input; only its `type` switches, and the button is a plain, keyboard-focusable control.
 */
@Directive({ selector: 'input[seInput][type=password]' })
export class PasswordToggleDirective implements OnInit, OnDestroy {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private wrapper: HTMLElement | null = null;
  private button: HTMLButtonElement | null = null;
  private path: SVGPathElement | null = null;
  private unlisten: (() => void) | null = null;
  private visible = false;

  ngOnInit(): void {
    const parent = this.renderer.parentNode(this.input) as Node | null;
    if (!parent) return;
    const wrapper = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(wrapper, 'password-field');
    this.renderer.insertBefore(parent, wrapper, this.input);
    this.renderer.appendChild(wrapper, this.input);
    const button = this.renderer.createElement('button') as HTMLButtonElement;
    this.renderer.setAttribute(button, 'type', 'button');
    this.renderer.addClass(button, 'password-toggle');
    const svg = this.renderer.createElement('svg', SVG) as SVGSVGElement;
    const attributes: readonly [string, string][] = [
      ['viewBox', '0 0 24 24'],
      ['fill', 'none'],
      ['stroke', 'currentColor'],
      ['stroke-width', '1.7'],
      ['stroke-linecap', 'round'],
      ['stroke-linejoin', 'round'],
      ['aria-hidden', 'true'],
    ];
    for (const [name, value] of attributes) this.renderer.setAttribute(svg, name, value);
    const path = this.renderer.createElement('path', SVG) as SVGPathElement;
    this.renderer.appendChild(svg, path);
    this.renderer.appendChild(button, svg);
    this.renderer.appendChild(wrapper, button);
    this.unlisten = this.renderer.listen(button, 'click', () => this.toggle());
    this.wrapper = wrapper;
    this.button = button;
    this.path = path;
    this.render();
  }

  ngOnDestroy(): void {
    this.unlisten?.();
    // The wrapper is ours, not Angular's: remove it so no button outlives its input.
    this.wrapper?.remove();
  }

  private toggle(): void {
    this.visible = !this.visible;
    this.render();
    this.input.focus();
  }

  private render(): void {
    if (!this.button || !this.path) return;
    this.renderer.setAttribute(this.input, 'type', this.visible ? 'text' : 'password');
    this.renderer.setAttribute(
      this.button,
      'aria-label',
      this.visible ? 'Hide password' : 'Show password',
    );
    this.renderer.setAttribute(this.button, 'aria-pressed', String(this.visible));
    this.renderer.setAttribute(this.path, 'd', this.visible ? EYE_OFF : EYE);
  }
}
