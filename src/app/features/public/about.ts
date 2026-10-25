import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../../shared/button';
import { IconComponent } from '../../shared/icon';
import { RevealDirective } from '../../shared/reveal';
import { describePage } from './page-meta';
import { AUDIENCES, VALUES } from './public-content';
import type { PublicItem } from './public-content';

@Component({
  selector: 'se-public-about',
  imports: [RouterLink, ButtonDirective, IconComponent, RevealDirective],
  templateUrl: './about.html',
})
export class PublicAboutComponent {
  protected readonly values = VALUES;
  protected readonly audiences = AUDIENCES;
  protected readonly problems: readonly PublicItem[] = [
    {
      icon: 'document',
      title: 'From registers to records',
      text: 'Paper registers and spreadsheets become organised flats, residents and occupancy history.',
    },
    {
      icon: 'receipt',
      title: 'From confusion to clarity',
      text: 'Residents see exactly what they owe, what they paid and the receipt for it.',
    },
    {
      icon: 'message',
      title: 'From scattered to connected',
      text: 'Notices and complaints live in one place instead of lost group-chat threads.',
    },
  ];
  protected readonly journey: readonly PublicItem[] = [
    {
      icon: 'sparkle',
      title: 'Platform onboarding',
      text: 'Mr. Livora sets up the society and invites its committee.',
    },
    {
      icon: 'shield',
      title: 'Committee verification',
      text: 'The committee reviews the details and activates the society.',
    },
    {
      icon: 'userPlus',
      title: 'Approved residents',
      text: 'Residents request membership and the committee approves access.',
    },
    {
      icon: 'people',
      title: 'Committee-led operations',
      text: 'The committee runs billing, payments, notices and complaints day to day.',
    },
  ];

  constructor() {
    describePage(
      'About Mr. Livora: our mission to make housing society management transparent, private and simple for committees and residents.',
    );
  }
}
