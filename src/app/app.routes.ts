import type { Routes } from '@angular/router';
import { authGuard, platformGuard, societyGuard } from './core/auth-guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
  {
    path: 'login',
    title: 'Sign in · SocietyEase',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPageComponent),
    data: { mode: 'login' },
  },
  {
    path: 'forgot-password',
    title: 'Reset password · SocietyEase',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPageComponent),
    data: { mode: 'forgot' },
  },
  {
    path: 'reset-password',
    title: 'Set a new password · SocietyEase',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPageComponent),
    data: { mode: 'reset' },
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'register',
        title: 'Create account · SocietyEase',
        data: { breadcrumb: 'Create account' },
        loadComponent: () =>
          import('./features/resident-access/register').then((m) => m.ResidentRegister),
      },
      {
        path: 'verify-resident-email',
        title: 'Verify email · SocietyEase',
        data: { breadcrumb: 'Verify email', mode: 'verify' },
        loadComponent: () => import('./features/resident-access/link').then((m) => m.ResidentLink),
      },
      {
        path: 'resident-invitation',
        title: 'Resident invitation · SocietyEase',
        data: { breadcrumb: 'Resident invitation' },
        loadComponent: () => import('./features/resident-access/link').then((m) => m.ResidentLink),
      },
      {
        path: 'join-society',
        title: 'Join a society · SocietyEase',
        canActivate: [authGuard],
        data: { breadcrumb: 'Join a society' },
        loadComponent: () => import('./features/resident-access/join').then((m) => m.ResidentJoin),
      },
      {
        path: 'accept-invitation',
        title: 'Committee invitation · SocietyEase',
        data: { breadcrumb: 'Invitation' },
        loadComponent: () =>
          import('./features/onboarding/invitation').then((m) => m.CommitteeInvitationComponent),
      },
      {
        path: 'onboarding/societies/:id',
        title: 'Society setup · SocietyEase',
        data: { breadcrumb: 'Society setup', scope: 'committee' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/onboarding/wizard').then((m) => m.OnboardingWizardComponent),
      },
      {
        path: 'workspace',
        title: 'Choose workspace · SocietyEase',
        data: { breadcrumb: 'Workspace' },
        canActivate: [authGuard],
        loadComponent: () => import('./features/auth/workspace').then((m) => m.WorkspaceComponent),
      },
      {
        path: 'platform',
        canActivate: [platformGuard],
        canActivateChild: [platformGuard],
        data: { breadcrumb: 'Platform' },
        loadChildren: () =>
          import('./features/platform/platform.routes').then((m) => m.PLATFORM_ROUTES),
      },
      {
        path: 'society',
        canActivate: [societyGuard],
        canActivateChild: [societyGuard],
        data: { breadcrumb: 'Community' },
        loadChildren: () =>
          import('./features/society/society.routes').then((m) => m.SOCIETY_ROUTES),
      },
      {
        path: 'ui',
        title: 'UI library · SocietyEase',
        data: { breadcrumb: 'UI library' },
        loadComponent: () => import('./features/ui/ui-preview').then((m) => m.UiPreviewComponent),
      },
      {
        path: '**',
        title: 'Page not found · SocietyEase',
        data: { breadcrumb: 'Page not found' },
        loadComponent: () => import('./features/not-found').then((m) => m.NotFoundComponent),
      },
    ],
  },
];
