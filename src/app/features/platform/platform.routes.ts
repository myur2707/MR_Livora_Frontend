import type { Routes } from '@angular/router';
export const PLATFORM_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard · Mr. Livora',
    data: { breadcrumb: 'Dashboard' },
    loadComponent: () => import('./overview').then((m) => m.OverviewComponent),
  },
  {
    path: 'societies',
    title: 'Societies/Flats/Townships · Mr. Livora',
    data: { breadcrumb: 'Societies/Flats/Townships' },
    loadComponent: () => import('./societies').then((m) => m.SocietiesComponent),
  },
  {
    path: 'audit-trail',
    title: 'Audit trail · Mr. Livora',
    data: { breadcrumb: 'Audit trail' },
    loadComponent: () => import('./audit-trail').then((m) => m.AuditTrailComponent),
  },
  {
    path: 'societies/:id',
    title: 'Society/Flat/Township onboarding · Mr. Livora',
    data: { breadcrumb: 'Onboarding', scope: 'platform' },
    loadComponent: () => import('../onboarding/wizard').then((m) => m.OnboardingWizardComponent),
  },
];
