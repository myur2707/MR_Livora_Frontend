import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../shared/icon';
import { NAVIGATION } from './navigation';

@Component({
  selector: 'se-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  host: { '[class.is-collapsed]': 'collapsed()', class: 'sidebar' },
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  readonly collapsed = input(false);
  readonly navigated = output<void>();
  protected readonly navigation = NAVIGATION;
}
