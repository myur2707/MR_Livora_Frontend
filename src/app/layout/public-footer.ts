import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONTACT, FOUNDERS } from '../features/public/public-content';
import { IconComponent } from '../shared/icon';

/** The full site footer, shared by public pages and signed-out app pages (e.g. invitations). */
@Component({
  selector: 'se-public-footer',
  imports: [RouterLink, IconComponent],
  templateUrl: './public-footer.html',
})
export class PublicFooterComponent {
  protected readonly contact = CONTACT;
  protected readonly founders = FOUNDERS;
  protected readonly year = new Date().getFullYear();
  private readonly document = inject(DOCUMENT);

  /** Returns to the top; smooth or instant follows the reduced-motion preference set in CSS. */
  protected backToTop(): void {
    this.document.defaultView?.scrollTo({ top: 0 });
    this.document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
  }
}
