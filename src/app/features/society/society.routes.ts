import { managementGuard, financeGuard, communityGuard } from '../../core/auth-guards';
import type { Routes } from '@angular/router';

export const SOCIETY_ROUTES: Routes = [
  ...(['notices', 'notices/new', 'notices/:id'] as const).map((path) => ({
    path: 'community/' + path,
    canActivate: [communityGuard('society.notices.manage')],
    data: { breadcrumb: 'Committee notices', create: path === 'notices/new' },
    loadComponent: () => import('../community/notices').then((m) => m.CommitteeNoticesPage),
  })),
  ...(['complaints', 'complaints/:id'] as const).map((path) => ({
    path: 'community/' + path,
    canActivate: [communityGuard('society.complaints.manage')],
    data: { breadcrumb: 'Committee complaints' },
    loadComponent: () => import('../community/complaints').then((m) => m.CommitteeComplaintsPage),
  })),
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'resident',
    data: { breadcrumb: 'My community' },
    loadChildren: () => import('../resident-portal/resident.routes').then((m) => m.RESIDENT_ROUTES),
  },
  ...(['payments', 'payments/report', 'payments/:id/receipt'] as const).map((path) => ({
    path: 'billing/' + path,
    canActivate: [financeGuard],
    data: {
      mode: path.endsWith('report') ? 'report' : path.endsWith('receipt') ? 'receipt' : 'history',
      breadcrumb: 'Payments',
    },
    loadComponent: () => import('../payments/history').then((m) => m.PaymentHistoryPage),
  })),
  ...(['payments/new', 'payments/:id/correct'] as const).map((path) => ({
    path: 'billing/' + path,
    canActivate: [financeGuard],
    data: { breadcrumb: 'Record payment' },
    loadComponent: () => import('../payments/record').then((m) => m.PaymentRecordPage),
  })),
  {
    path: 'billing/payments/:id',
    canActivate: [financeGuard],
    data: { breadcrumb: 'Payment details' },
    loadComponent: () => import('../payments/history').then((m) => m.PaymentHistoryPage),
  },
  ...(['configuration', 'periods'] as const).map((mode) => ({
    path: 'billing/' + mode,
    canActivate: [financeGuard],
    data: { mode, breadcrumb: mode === 'periods' ? 'Billing periods' : 'Charge configuration' },
    loadComponent: () => import('../billing/configuration').then((m) => m.BillingConfigurationPage),
  })),
  {
    path: 'billing/generate',
    canActivate: [financeGuard],
    data: { breadcrumb: 'Generate bills' },
    loadComponent: () => import('../billing/generate').then((m) => m.BillingGeneratePage),
  },
  ...(['bills', 'outstanding'] as const).map((mode) => ({
    path: 'billing/' + mode,
    canActivate: [financeGuard],
    data: { mode, breadcrumb: mode === 'bills' ? 'Bills' : 'Outstanding' },
    loadComponent: () => import('../billing/bills').then((m) => m.BillingBillsPage),
  })),
  {
    path: 'billing/bills/:id',
    canActivate: [financeGuard],
    data: { breadcrumb: 'Bill details' },
    loadComponent: () => import('../billing/bills').then((m) => m.BillingBillsPage),
  },
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
      import('../resident-portal/dashboard').then((m) => m.ResidentDashboardPage),
  },
];
