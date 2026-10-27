import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ThemeService } from '../core/theme';
import { ButtonDirective } from '../shared/button';
import { DrawerComponent } from '../shared/drawer';
import { DialogComponent } from '../shared/dialog';
import { IconComponent } from '../shared/icon';
import { BreadcrumbsComponent } from './breadcrumbs';
import { SidebarComponent } from './sidebar';
import { AuthService, authErrorMessage } from '../core/auth';
import { ToastService } from '../shared/toast';
import { SocietySwitcher } from './society-switcher';
import { BottomNavComponent } from './bottom-nav';
import { PublicHeaderComponent } from './public-header';
import { VisibleNavigation } from './visible-navigation';
import { PublicFooterComponent } from './public-footer';

@Component({
  selector: 'se-app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ButtonDirective,
    DrawerComponent,
    DialogComponent,
    IconComponent,
    BreadcrumbsComponent,
    SidebarComponent,
    SocietySwitcher,
    BottomNavComponent,
    PublicHeaderComponent,
    PublicFooterComponent,
  ],
  templateUrl: './app-shell.html',
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
  /* Signed-out visitors get the public site header instead of the workspace chrome. */
  protected readonly signedIn = computed(() => this.auth.state.identity() !== null);
  /** Same copyright year as the public footer. */
  protected readonly year = new Date().getFullYear();
  private readonly navigation = inject(VisibleNavigation).items;
  /** Phone header brand goes to the first page this account can open. */
  protected readonly homePath = computed(() => this.navigation()[0]?.path ?? '/workspace');
  /** The bell opens the notices this account may read, if any. */
  protected readonly noticesPath = computed(
    () =>
      this.navigation().find((item) =>
        ['/society/resident/notices', '/society/community/notices'].includes(item.path),
      )?.path ?? null,
  );
  protected readonly signingOut = signal(false);
  protected readonly logoutConfirmationOpen = signal(false);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly collapsed = signal(false);
  protected readonly mobileOpen = signal(false);
  protected readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  constructor() {
    let hadSession = false;
    effect(() => {
      const signedIn = this.auth.state.identity() !== null;
      // Destroy every private routed view when any API request detects session loss.
      if (hadSession && !signedIn) void this.router.navigateByUrl('/login');
      hadSession = signedIn;
    });
    const breakpoint = this.document.defaultView?.matchMedia('(min-width: 960px)');
    const closeOnDesktop = (): void => {
      if (breakpoint?.matches) this.mobileOpen.set(false);
    };
    breakpoint?.addEventListener('change', closeOnDesktop);
    inject(DestroyRef).onDestroy(() => breakpoint?.removeEventListener('change', closeOnDesktop));
    inject(Router)
      .events.pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event instanceof NavigationEnd) this.mobileOpen.set(false);
      });
  }

  protected focusPage(): void {
    afterNextRender(
      () => this.document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }
  protected requestLogout(): void {
    if (!this.signingOut()) this.logoutConfirmationOpen.set(true);
  }
  protected cancelLogout(): void {
    if (!this.signingOut()) this.logoutConfirmationOpen.set(false);
  }
  protected async logout(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    try {
      await this.auth.logout();
      this.logoutConfirmationOpen.set(false);
      await this.router.navigateByUrl('/login');
    } catch (error) {
      this.toast.show(authErrorMessage(error));
    } finally {
      this.signingOut.set(false);
    }
  }
}
