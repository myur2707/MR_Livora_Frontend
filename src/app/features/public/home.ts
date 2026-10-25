import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../../shared/button';
import { IconComponent } from '../../shared/icon';
import { RevealDirective } from '../../shared/reveal';
import { describePage } from './page-meta';
import { AUDIENCES, FEATURES, STEPS, TRUST } from './public-content';

@Component({
  selector: 'se-public-home',
  imports: [RouterLink, ButtonDirective, IconComponent, RevealDirective],
  templateUrl: './home.html',
})
export class PublicHomeComponent {
  protected readonly features = FEATURES;
  protected readonly steps = STEPS;
  protected readonly audiences = AUDIENCES;
  protected readonly trust = TRUST;
  /* Decorative tiles in the hero device mock-up; each names a real resident feature. */
  protected readonly previewTiles = [
    { icon: 'receipt', label: 'My bills' },
    { icon: 'wallet', label: 'Payments' },
    { icon: 'bell', label: 'Notices' },
    { icon: 'message', label: 'Complaints' },
    { icon: 'document', label: 'Receipts' },
    { icon: 'building', label: 'My flats' },
  ] as const;

  constructor() {
    describePage(
      'Mr. Livora is a smart society management app for committees, staff, owners and tenants: billing, payments, receipts, notices, complaints and reports in one place.',
    );
  }
}
