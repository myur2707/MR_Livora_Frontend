import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../shared/icon';
import { VisibleNavigation } from './visible-navigation';

interface TabChoice {
  readonly path: string;
  readonly label: string;
}

/* Each slot lists equivalent destinations by role; the first one the user can see fills the slot. */
const TAB_SLOTS: readonly (readonly TabChoice[])[] = [
  [
    { path: '/society/resident/dashboard', label: 'Home' },
    { path: '/society/dashboard', label: 'Home' },
    { path: '/platform/dashboard', label: 'Home' },
    { path: '/workspace', label: 'Home' },
  ],
  [
    { path: '/society/resident/notices', label: 'Notices' },
    { path: '/society/community/notices', label: 'Notices' },
  ],
  [
    { path: '/society/resident/bills', label: 'Bills' },
    { path: '/society/billing/bills', label: 'Bills' },
    { path: '/platform/societies', label: 'Societies' },
  ],
  [
    { path: '/society/resident/complaints', label: 'Complaints' },
    { path: '/society/community/complaints', label: 'Complaints' },
  ],
  [{ path: '/profile', label: 'Profile' }],
];
const MAX_TABS = 4;

@Component({
  selector: 'se-bottom-nav',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `<nav class="bottom-nav" aria-label="Quick navigation">
    @for (tab of tabs(); track tab.path) {
      <a [routerLink]="tab.path" routerLinkActive="active" ariaCurrentWhenActive="page"
        ><se-icon [name]="tab.icon" /><span class="bottom-nav-label">{{ tab.label }}</span></a
      >
    }
    <button
      type="button"
      aria-haspopup="dialog"
      [attr.aria-expanded]="moreOpen()"
      (click)="moreRequested.emit()"
    >
      <se-icon name="grid" /><span class="bottom-nav-label">More</span>
    </button>
  </nav>`,
})
export class BottomNavComponent {
  readonly moreOpen = input(false);
  readonly moreRequested = output<void>();
  private readonly navigation = inject(VisibleNavigation).items;
  protected readonly tabs = computed(() => {
    const visible = new Map(this.navigation().map((item) => [item.path, item]));
    return TAB_SLOTS.flatMap((slot) => {
      const choice = slot.find(({ path }) => visible.has(path));
      const item = choice && visible.get(choice.path);
      return choice && item ? [{ ...choice, icon: item.icon }] : [];
    }).slice(0, MAX_TABS);
  });
}
