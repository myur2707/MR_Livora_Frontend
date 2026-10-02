import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { AuthService } from './auth';

// UX only: the API independently validates sessions, membership and permissions.
export const financeGuard = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    const identity = await auth.refresh();
    return (
      !!identity?.activeSociety?.permissions.includes('society.finance.read') ||
      router.createUrlTree(['/workspace'])
    );
  } catch {
    return router.createUrlTree(['/login']);
  }
};
export const authGuard: CanActivateFn = async (_route, routeState) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    if (await auth.refresh()) return true;
  } catch {
    /* A network failure cannot grant access. */
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: routeState.url } });
};
export const platformGuard = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    const identity = await auth.refresh();
    if (!identity) return router.createUrlTree(['/login']);
    return identity.platformAdmin || router.createUrlTree(['/workspace']);
  } catch {
    return router.createUrlTree(['/login']);
  }
};
export const societyGuard = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    const identity = await auth.refresh();
    if (!identity) return router.createUrlTree(['/login']);
    return (
      !!identity.activeSociety?.permissions.includes('society.dashboard.read') ||
      router.createUrlTree(['/workspace'])
    );
  } catch {
    return router.createUrlTree(['/login']);
  }
};
export const managementGuard = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    const identity = await auth.refresh();
    return (
      !!(
        identity?.activeSociety?.roles.includes('COMMITTEE_ADMIN') &&
        identity.activeSociety.permissions.includes('society.members.manage')
      ) || router.createUrlTree(['/workspace'])
    );
  } catch {
    return router.createUrlTree(['/login']);
  }
};
