import { DOCUMENT } from '@angular/common';
import { Component, Injector, afterNextRender, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CONTACT } from '../features/public/public-content';
import { IconComponent } from '../shared/icon';
import { PublicHeaderComponent } from './public-header';

@Component({
  selector: 'se-public-shell',
  imports: [RouterLink, RouterOutlet, IconComponent, PublicHeaderComponent],
  templateUrl: './public-shell.html',
})
export class PublicShellComponent {
  protected readonly contact = CONTACT;
  protected readonly year = new Date().getFullYear();
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

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
