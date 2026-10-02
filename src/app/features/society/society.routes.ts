import { managementGuard } from '../../core/auth-guards';
import type { Routes } from '@angular/router';

export const SOCIETY_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'resident-access',
    canActivate: [managementGuard],
    title: 'Resident access · SocietyEase',
    data: { breadcrumb: 'Resident access' },
    loadComponent: () =>
      import('../resident-access/committee').then((m) => m.ResidentAccessCommittee),
  },

  ...(['buildings', 'flats', 'persons'] as const).map((kind) => ({
    path: kind,
    canActivate: [managementGuard],
    title: kind === 'persons' ? 'Residents · SocietyEase' : kind + ' · SocietyEase',
    data: { kind, breadcrumb: kind === 'persons' ? 'Residents' : kind },
    loadComponent: () => import('../property/directory').then((m) => m.PropertyDirectory),
  })),
  {
    path: 'flats/:id',
    canActivate: [managementGuard],
    title: 'Flat details · SocietyEase',
    data: { breadcrumb: 'Flat details' },
    loadComponent: () => import('../property/flat-detail').then((m) => m.FlatDetail),
  },
  {
    path: 'imports',
    canActivate: [managementGuard],
    title: 'CSV imports · SocietyEase',
    data: { breadcrumb: 'Imports' },
    loadComponent: () => import('../property/imports').then((m) => m.PropertyImports),
  },
  {
    path: 'dashboard',
    title: 'Community space · SocietyEase',
    data: {
      breadcrumb: 'Dashboard',
      heading: 'Your community space',
      eyebrow: 'SOCIETY WORKSPACE',
      message: 'One welcoming place for the everyday life of your society.',
    },
    loadComponent: () =>
      import('../workspace-placeholder').then((m) => m.WorkspacePlaceholderComponent),
  },
];
