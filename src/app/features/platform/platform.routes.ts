import type { Routes } from '@angular/router';
export const PLATFORM_ROUTES: Routes = [
  {
    path: 'dashboard',
    title: 'Platform overview · SocietyEase',
    data: { breadcrumb: 'Overview' },
    loadComponent: () => import('./overview').then((m) => m.OverviewComponent),
  },
  {
    path: 'societies',
    title: 'Societies · SocietyEase',
    data: { breadcrumb: 'Societies' },
    loadComponent: () => import('./societies').then((m) => m.SocietiesComponent),
  },
  {
    path: 'societies/:id',
    title: 'Society onboarding · SocietyEase',
    data: { breadcrumb: 'Onboarding', scope: 'platform' },
    loadComponent: () => import('../onboarding/wizard').then((m) => m.OnboardingWizardComponent),
  },
];
