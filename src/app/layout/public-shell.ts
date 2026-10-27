import { DOCUMENT } from '@angular/common';
import { Component, Injector, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicFooterComponent } from './public-footer';
import { PublicHeaderComponent } from './public-header';
import { WhatsappButtonComponent } from './whatsapp-button';

@Component({
  selector: 'se-public-shell',
  imports: [RouterOutlet, PublicHeaderComponent, PublicFooterComponent, WhatsappButtonComponent],
  templateUrl: './public-shell.html',
})
export class PublicShellComponent {
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
