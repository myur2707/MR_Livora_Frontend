import type { Routes } from '@angular/router';
import { authGuard, platformGuard, societyGuard, workspaceGuard } from './core/auth-guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
  {
    path: 'login',
    title: 'Sign in · Mr. Livora',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPageComponent),
    data: { mode: 'login' },
  },
  {
    path: 'forgot-password',
    title: 'Reset password · Mr. Livora',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPageComponent),
    data: { mode: 'forgot' },
  },
  {
    path: 'reset-password',
    title: 'Set a new password · Mr. Livora',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPageComponent),
    data: { mode: 'reset' },
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'register',
        title: 'Create account · Mr. Livora',
        data: { breadcrumb: 'Create account' },
        loadComponent: () =>
          import('./features/resident-access/register').then((m) => m.ResidentRegister),
      },
      {
        path: 'verify-resident-email',
        title: 'Verify email · Mr. Livora',
        data: { breadcrumb: 'Verify email', mode: 'verify' },
        loadComponent: () => import('./features/resident-access/link').then((m) => m.ResidentLink),
      },
      {
        path: 'resident-invitation',
        title: 'Resident invitation · Mr. Livora',
        data: { breadcrumb: 'Resident invitation' },
        loadComponent: () => import('./features/resident-access/link').then((m) => m.ResidentLink),
      },
      {
        path: 'profile',
        title: 'My profile · Mr. Livora',
        canActivate: [authGuard],
        data: { breadcrumb: 'My profile' },
        loadComponent: () => import('./features/auth/profile').then((m) => m.AccountProfilePage),
      },
      {
        path: 'join-society',
        title: 'Membership requests · Mr. Livora',
        canActivate: [authGuard],
        data: { breadcrumb: 'Membership requests' },
        loadComponent: () => import('./features/resident-access/join').then((m) => m.ResidentJoin),
      },
      {
        path: 'accept-invitation',
        title: 'Committee invitation · Mr. Livora',
        data: { breadcrumb: 'Invitation' },
        loadComponent: () =>
          import('./features/onboarding/invitation').then((m) => m.CommitteeInvitationComponent),
      },
      {
        path: 'onboarding/societies/:id',
        title: 'Society setup · Mr. Livora',
        data: { breadcrumb: 'Society setup', scope: 'committee' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/onboarding/wizard').then((m) => m.OnboardingWizardComponent),
      },
      {
        path: 'workspace',
        title: 'Choose workspace · Mr. Livora',
        data: { breadcrumb: 'Workspace' },
        canActivate: [workspaceGuard],
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
        title: 'UI library · Mr. Livora',
        data: { breadcrumb: 'UI library' },
        loadComponent: () => import('./features/ui/ui-preview').then((m) => m.UiPreviewComponent),
      },
      {
        path: '**',
        title: 'Page not found · Mr. Livora',
        data: { breadcrumb: 'Page not found' },
        loadComponent: () => import('./features/not-found').then((m) => m.NotFoundComponent),
      },
    ],
  },
];
