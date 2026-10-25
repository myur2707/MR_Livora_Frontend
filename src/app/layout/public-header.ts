import { DOCUMENT, ViewportScroller } from '@angular/common';
import {
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthState } from '../core/auth-state';
import { ThemeService } from '../core/theme';
import { ButtonDirective } from '../shared/button';
import { DrawerComponent } from '../shared/drawer';
import { IconComponent } from '../shared/icon';
import type { IconName } from '../shared/icon';

type NavKey = 'home' | 'features' | 'about' | 'contact';

interface NavLink {
  readonly key: NavKey;
  readonly label: string;
  readonly path: string;
  readonly fragment?: string;
  readonly icon: IconName;
}

const NAV_LINKS: readonly NavLink[] = [
  { key: 'home', label: 'Home', path: '/', icon: 'home' },
  { key: 'features', label: 'Features', path: '/', fragment: 'features', icon: 'grid' },
  { key: 'about', label: 'About Us', path: '/about', icon: 'people' },
  { key: 'contact', label: 'Contact Us', path: '/contact', icon: 'mail' },
];
const FEATURES_ID = 'features';
/* Distance from the top of the viewport at which a section counts as "being read". */
const SPY_LINE = 160;
/* Space kept above anchored sections so the floating header never covers their heading. */
const ANCHOR_OFFSET = 104;
/* The header only starts hiding once the visitor has scrolled past the hero's top. */
const HIDE_AFTER = 160;
/* Ignore tiny scroll jitter when deciding the scroll direction. */
const SCROLL_DELTA = 8;
/* Keep the header visible while a menu jump scrolls the page. */
const PIN_DURATION_MS = 1200;

/** Site header for visitors who are not signed in: public pages, sign-in and registration. */
@Component({
  selector: 'se-public-header',
  imports: [RouterLink, RouterLinkActive, ButtonDirective, DrawerComponent, IconComponent],
  templateUrl: './public-header.html',
  host: { '[class.is-scrolled]': 'scrollY() > 12', '[class.is-hidden]': 'hidden()' },
})
export class PublicHeaderComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly links = NAV_LINKS;
  protected readonly menuOpen = signal(false);
  protected readonly scrollY = signal(0);
  protected readonly hidden = signal(false);
  /** Position of the sliding active-tab pill, measured from the active link. */
  protected readonly indicator = signal<{ left: number; width: number } | null>(null);
  private readonly auth = inject(AuthState);
  /* Reads the in-memory session only; the header never calls private APIs. */
  protected readonly signedIn = computed(() => this.auth.identity() !== null);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly scroller = inject(ViewportScroller);
  private readonly injector = inject(Injector);
  private readonly nav = viewChild<ElementRef<HTMLElement>>('nav');
  private readonly path = signal(this.currentPath());
  private pinnedUntil = 0;

  /** Page links follow the URL; on the home page, scroll position decides Home vs Features. */
  protected readonly active = computed<NavKey | null>(() => {
    const path = this.path();
    this.scrollY();
    if (path === '/about') return 'about';
    if (path === '/contact') return 'contact';
    if (path !== '/') return null;
    const section = this.document.getElementById(FEATURES_ID)?.getBoundingClientRect();
    return section && section.top <= SPY_LINE && section.bottom > SPY_LINE ? 'features' : 'home';
  });

  constructor() {
    this.scroller.setOffset([0, ANCHOR_OFFSET]);
    const view = this.document.defaultView;
    let lastY = view?.scrollY ?? 0;
    const onScroll = (): void => {
      const y = view?.scrollY ?? 0;
      this.scrollY.set(y);
      if (Math.abs(y - lastY) < SCROLL_DELTA) return;
      const pinned = this.menuOpen() || Date.now() < this.pinnedUntil;
      this.hidden.set(!pinned && y > lastY && y > HIDE_AFTER);
      lastY = y;
    };
    const onResize = (): void => this.measureIndicator();
    view?.addEventListener('scroll', onScroll, { passive: true });
    view?.addEventListener('resize', onResize, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      view?.removeEventListener('scroll', onScroll);
      view?.removeEventListener('resize', onResize);
    });
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      this.path.set(this.currentPath());
      this.menuOpen.set(false);
      this.hidden.set(false);
    });
    effect(() => {
      this.active();
      afterNextRender(() => this.measureIndicator(), { injector: this.injector });
    });
  }

  /**
   * Router navigation is skipped when the URL is unchanged, so repeat clicks on Home or
   * Features would do nothing; scroll explicitly in that case.
   */
  protected followLink(link: NavLink): void {
    this.menuOpen.set(false);
    this.hidden.set(false);
    this.pinnedUntil = Date.now() + PIN_DURATION_MS;
    if (this.path() !== '/' || link.path !== '/') return;
    if (link.fragment) this.scroller.scrollToAnchor(link.fragment);
    else this.scroller.scrollToPosition([0, 0]);
  }

  private measureIndicator(): void {
    const key = this.active();
    const target =
      key && this.nav()?.nativeElement.querySelector<HTMLElement>(`[data-nav="${key}"]`);
    this.indicator.set(target ? { left: target.offsetLeft, width: target.offsetWidth } : null);
  }

  private currentPath(): string {
    return this.router.url.split(/[?#]/, 1)[0] ?? '/';
  }
}
