import type { IconName } from '../shared/icon';

export const NAVIGATION: readonly { label: string; path: string; icon: IconName; group: string }[] =
  [
    ...(
      ['dashboard', 'flats', 'bills', 'payments', 'receipts', 'notices', 'complaints'] as const
    ).map((path, index) => ({
      path: '/society/resident/' + path,
      label:
        [
          'My community',
          'My Flats',
          'My Bills',
          'Payment History',
          'My Receipts',
          'Notices',
          'My Complaints',
        ][index] ?? path,
      icon:
        (['home', 'building', 'receipt', 'wallet', 'receipt', 'bell', 'message'] as const)[index] ??
        'home',
      group: 'My living',
    })),
    { label: 'Workspace', path: '/workspace', icon: 'home', group: 'Workspace' },
    { label: 'Overview', path: '/platform/dashboard', icon: 'home', group: 'Workspace' },
    {
      label: 'Societies or Flats or Townships',
      path: '/platform/societies',
      icon: 'building',
      group: 'Workspace',
    },
    { label: 'Community space', path: '/society/dashboard', icon: 'home', group: 'Workspace' },
    {
      label: 'Financial reports',
      path: '/society/reports/outstanding',
      icon: 'chart',
      group: 'Reports',
    },
    {
      label: 'Resident reports',
      path: '/society/reports/residents',
      icon: 'document',
      group: 'Reports',
    },
    {
      label: 'Committee notices',
      path: '/society/community/notices',
      icon: 'bell',
      group: 'Community',
    },
    {
      label: 'Committee complaints',
      path: '/society/community/complaints',
      icon: 'message',
      group: 'Community',
    },
    { label: 'Buildings', path: '/society/buildings', icon: 'building', group: 'Community' },
    { label: 'Flats', path: '/society/flats', icon: 'building', group: 'Community' },
    { label: 'Residents', path: '/society/persons', icon: 'people', group: 'Community' },
    { label: 'CSV imports', path: '/society/imports', icon: 'upload', group: 'Community' },
    {
      label: 'Resident access',
      path: '/society/resident-access',
      icon: 'shield',
      group: 'Community',
    },
    { label: 'Membership requests', path: '/join-society', icon: 'userPlus', group: 'Workspace' },
    { label: 'My profile', path: '/profile', icon: 'user', group: 'Workspace' },
    {
      label: 'Charge configuration',
      path: '/society/billing/configuration',
      icon: 'settings',
      group: 'Maintenance',
    },
    {
      label: 'Billing periods',
      path: '/society/billing/periods',
      icon: 'calendar',
      group: 'Maintenance',
    },
    {
      label: 'Generate bills',
      path: '/society/billing/generate',
      icon: 'filePlus',
      group: 'Maintenance',
    },
    { label: 'Bills', path: '/society/billing/bills', icon: 'receipt', group: 'Maintenance' },
    { label: 'Payments', path: '/society/billing/payments', icon: 'wallet', group: 'Maintenance' },
    {
      label: 'Collection report',
      path: '/society/billing/payments/report',
      icon: 'chart',
      group: 'Maintenance',
    },
    {
      label: 'Outstanding',
      path: '/society/billing/outstanding',
      icon: 'alert',
      group: 'Maintenance',
    },
    { label: 'UI library', path: '/ui', icon: 'grid', group: 'Foundation' },
  ];
