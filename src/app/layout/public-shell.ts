import { DOCUMENT } from '@angular/common';
import { Component, Injector, afterNextRender, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CONTACT, FOUNDERS } from '../features/public/public-content';
import { IconComponent } from '../shared/icon';
import { PublicHeaderComponent } from './public-header';

@Component({
  selector: 'se-public-shell',
  imports: [RouterLink, RouterOutlet, IconComponent, PublicHeaderComponent],
  templateUrl: './public-shell.html',
})
export class PublicShellComponent {
  protected readonly contact = CONTACT;
  protected readonly founders = FOUNDERS;
  protected readonly year = new Date().getFullYear();
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  /** Returns to the top; smooth or instant follows the reduced-motion preference set in CSS. */
  protected backToTop(): void {
    this.document.defaultView?.scrollTo({ top: 0 });
    this.document.querySelector<HTMLElement>('#public-content')?.focus({ preventScroll: true });
  }
  protected focusPage(): void {
    afterNextRender(
      () =>
        this.document
          .querySelector<HTMLElement>('#public-content h1')
          ?.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }
}
