import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * Fades content in once it scrolls into view. Content stays visible when motion is reduced or
 * IntersectionObserver is unavailable, so nothing depends on the animation running.
 */
@Directive({
  selector: '[seReveal]',
  host: {
    class: 'reveal',
    '[class.is-visible]': 'visible()',
    '[style.--reveal-index]': 'seReveal() || 0',
  },
})
export class RevealDirective {
  /** Optional position in a group, used to stagger neighbouring items. */
  readonly seReveal = input<number | ''>('');
  protected readonly visible = signal(false);

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const view = inject(DOCUMENT).defaultView;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (
        !view?.IntersectionObserver ||
        view.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        this.visible.set(true);
        return;
      }
      const observer = new view.IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          this.visible.set(true);
          observer.disconnect();
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
