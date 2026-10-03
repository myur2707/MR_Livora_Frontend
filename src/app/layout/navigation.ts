import type { IconName } from '../shared/icon';

export const NAVIGATION: readonly { label: string; path: string; icon: IconName; group: string }[] =
  [
    ...(
      [
        'dashboard',
        'flats',
        'bills',
        'payments',
        'receipts',
        'notices',
        'complaints',
        'profile',
      ] as const
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
          'My Profile',
        ][index] ?? path,
      icon: 'home' as const,
      group: 'My living',
    })),
    { label: 'Overview', path: '/platform/dashboard', icon: 'home', group: 'Workspace' },
    { label: 'Societies', path: '/platform/societies', icon: 'building', group: 'Workspace' },
    { label: 'Community space', path: '/society/dashboard', icon: 'people', group: 'Workspace' },
    { label: 'Buildings', path: '/society/buildings', icon: 'building', group: 'Community' },
    { label: 'Flats', path: '/society/flats', icon: 'building', group: 'Community' },
    { label: 'Residents', path: '/society/persons', icon: 'people', group: 'Community' },
    { label: 'CSV imports', path: '/society/imports', icon: 'grid', group: 'Community' },
    {
      label: 'Resident access',
      path: '/society/resident-access',
      icon: 'people',
      group: 'Community',
    },
    { label: 'Join a society', path: '/join-society', icon: 'people', group: 'Workspace' },
    {
      label: 'Charge configuration',
      path: '/society/billing/configuration',
      icon: 'grid',
      group: 'Maintenance',
    },
    {
      label: 'Billing periods',
      path: '/society/billing/periods',
      icon: 'grid',
      group: 'Maintenance',
    },
    {
      label: 'Generate bills',
      path: '/society/billing/generate',
      icon: 'grid',
      group: 'Maintenance',
    },
    { label: 'Bills', path: '/society/billing/bills', icon: 'grid', group: 'Maintenance' },
    { label: 'Payments', path: '/society/billing/payments', icon: 'grid', group: 'Maintenance' },
    {
      label: 'Collection report',
      path: '/society/billing/payments/report',
      icon: 'grid',
      group: 'Maintenance',
    },
    {
      label: 'Outstanding',
      path: '/society/billing/outstanding',
      icon: 'grid',
      group: 'Maintenance',
    },
    { label: 'UI library', path: '/ui', icon: 'grid', group: 'Foundation' },
  ];
