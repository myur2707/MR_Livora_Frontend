import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ThemeService } from '../core/theme';
import { ButtonDirective } from '../shared/button';
import { DrawerComponent } from '../shared/drawer';
import { IconComponent } from '../shared/icon';
import { BreadcrumbsComponent } from './breadcrumbs';
import { SidebarComponent } from './sidebar';
import { AuthService, authErrorMessage } from '../core/auth';
import { ToastService } from '../shared/toast';
import { SocietySwitcher } from './society-switcher';

@Component({
  selector: 'se-app-shell',
  imports: [
    RouterLink,
    RouterOutlet,
    ButtonDirective,
    DrawerComponent,
    IconComponent,
    BreadcrumbsComponent,
    SidebarComponent,
    SocietySwitcher,
  ],
  templateUrl: './app-shell.html',
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly signingOut = signal(false);
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
  protected async logout(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      this.toast.show(authErrorMessage(error));
    } finally {
      this.signingOut.set(false);
    }
  }
}
