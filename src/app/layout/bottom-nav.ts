import {
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { IconComponent } from '../shared/icon';
import { VisibleNavigation } from './visible-navigation';

/* Destinations kept out of the tab bar; they stay reachable from the drawer. */
const EXCLUDED_PATHS: ReadonlySet<string> = new Set(['/ui']);
/* Compact labels for destinations whose full names do not fit a tab. */
const TAB_LABELS: Readonly<Record<string, string>> = {
  'My community': 'Home',
  'Payment History': 'Payments',
  'My Receipts': 'Receipts',
  'My Complaints': 'Complaints',
  'Societies/Flats/Townships': 'Societies',
  'Community space': 'Community',
  'Financial reports': 'Finance',
  'Resident reports': 'Resident list',
  'Committee notices': 'Post notices',
  'Committee complaints': 'Resolve issues',
  'CSV imports': 'Imports',
  'Resident access': 'Access',
  'Membership requests': 'Requests',
  'My profile': 'Profile',
  'Charge configuration': 'Charges',
  'Billing periods': 'Periods',
  'Generate bills': 'Generate',
  'Collection report': 'Collections',
};
/* Up to this many tabs share the full width; more tabs scroll horizontally. */
const MAX_FITTED_TABS = 5;

@Component({
  selector: 'se-bottom-nav',
  imports: [RouterLink, IconComponent],
  template: `<nav
    #bar
    class="bottom-nav"
    aria-label="Quick navigation"
    [class.has-active]="activeIndex() >= 0"
    [class.is-scrollable]="tabs().length > maxFittedTabs"
    [style.--tab-count]="tabs().length"
    [style.--active-index]="activeIndex() < 0 ? 0 : activeIndex()"
  >
    <div class="bottom-nav-track">
      <span class="bottom-nav-bubble" aria-hidden="true"></span>
      @for (tab of tabs(); track tab.path; let index = $index) {
        <a
          [routerLink]="tab.path"
          [class.active]="index === activeIndex()"
          [attr.aria-current]="index === activeIndex() ? 'page' : null"
          ><se-icon [name]="tab.icon" /><span class="bottom-nav-label">{{ tab.label }}</span></a
        >
      }
    </div>
  </nav>`,
})
export class BottomNavComponent {
  protected readonly maxFittedTabs = MAX_FITTED_TABS;
  private readonly navigation = inject(VisibleNavigation).items;
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly bar = viewChild<ElementRef<HTMLElement>>('bar');
  protected readonly tabs = computed(() =>
    this.navigation()
      .filter((item) => !EXCLUDED_PATHS.has(item.path))
      .map((item) => ({
        path: item.path,
        icon: item.icon,
        label: TAB_LABELS[item.label] ?? item.label,
      })),
  );
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  /** Drives the notch and bubble; -1 when the current page has no tab. */
  protected readonly activeIndex = computed(() => {
    const path = this.url().split(/[?#]/, 1)[0] ?? '';
    // The most specific matching destination wins, e.g. a report nested under payments.
    let best = -1;
    let bestLength = 0;
    this.tabs().forEach((tab, index) => {
      const matches = path === tab.path || path.startsWith(tab.path + '/');
      if (matches && tab.path.length > bestLength) {
        best = index;
        bestLength = tab.path.length;
      }
    });
    return best;
  });

  constructor() {
    effect(() => {
      const index = this.activeIndex();
      afterNextRender(() => this.revealTab(index), { injector: this.injector });
    });
  }

  /** Scrolls an overflowing bar so the active tab sits in the middle. */
  private revealTab(index: number): void {
    const bar = this.bar()?.nativeElement;
    const tab = bar?.querySelectorAll('a')[index];
    if (!bar || !tab || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({
      left: tab.offsetLeft + tab.offsetWidth / 2 - bar.clientWidth / 2,
      behavior: 'smooth',
    });
  }
}
