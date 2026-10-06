import type { Routes } from '@angular/router';
export const PLATFORM_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Overview · Mr. Livora',
    data: { breadcrumb: 'Overview' },
    loadComponent: () => import('./overview').then((m) => m.OverviewComponent),
  },
  {
    path: 'societies',
    title: 'Societies or Flats or Townships · Mr. Livora',
    data: { breadcrumb: 'Societies or Flats or Townships' },
    loadComponent: () => import('./societies').then((m) => m.SocietiesComponent),
  },
  {
    path: 'societies/:id',
    title: 'Society or Flat or Township onboarding · Mr. Livora',
    data: { breadcrumb: 'Onboarding', scope: 'platform' },
    loadComponent: () => import('../onboarding/wizard').then((m) => m.OnboardingWizardComponent),
  },
];
