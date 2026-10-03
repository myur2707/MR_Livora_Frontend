import type { Routes } from '@angular/router';
export const RESIDENT_ROUTES: Routes = [
  {
    path: '',
    data: { breadcrumb: null },
    loadComponent: () => import('./shell').then((m) => m.ResidentShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        data: { breadcrumb: 'My community' },
        loadComponent: () => import('./dashboard').then((m) => m.ResidentDashboardPage),
      },
      ...['flats', 'flats/:id'].map((path) => ({
        path,
        data: { breadcrumb: 'My Flats' },
        loadComponent: () => import('./flats').then((m) => m.ResidentFlatsPage),
      })),
      ...['bills', 'bills/:id'].map((path) => ({
        path,
        data: { breadcrumb: 'My Bills' },
        loadComponent: () => import('./bills').then((m) => m.ResidentBillsPage),
      })),
      ...['payments', 'receipts', 'payments/:id/receipt'].map((path) => ({
        path,
        data: { breadcrumb: 'My payments', mode: path === 'receipts' ? 'receipts' : 'payments' },
        loadComponent: () => import('./payments').then((m) => m.ResidentPaymentsPage),
      })),
      ...['notices', 'notices/:id', 'complaints', 'complaints/:id'].map((path) => ({
        path,
        data: {
          breadcrumb: path.startsWith('notices') ? 'Notices' : 'My Complaints',
          kind: path.startsWith('notices') ? 'notices' : 'complaints',
        },
        loadComponent: () => import('./community').then((m) => m.ResidentCommunityPage),
      })),
      {
        path: 'profile',
        data: { breadcrumb: 'My Profile' },
        loadComponent: () => import('./profile').then((m) => m.ResidentProfilePage),
      },
    ],
  },
];
