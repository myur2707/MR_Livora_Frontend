import type { IconName } from '../shared/icon';

export const NAVIGATION: readonly { label: string; path: string; icon: IconName; group: string }[] =
  [
    { label: 'Overview', path: '/platform/dashboard', icon: 'home', group: 'Workspace' },
    { label: 'Societies', path: '/platform/societies', icon: 'building', group: 'Workspace' },
    { label: 'Community space', path: '/society/dashboard', icon: 'people', group: 'Workspace' },
    { label: 'Buildings', path: '/society/buildings', icon: 'building', group: 'Community' },
    { label: 'Flats', path: '/society/flats', icon: 'building', group: 'Community' },
    { label: 'Residents', path: '/society/persons', icon: 'people', group: 'Community' },
    { label: 'CSV imports', path: '/society/imports', icon: 'grid', group: 'Community' },
    { label: 'UI library', path: '/ui', icon: 'grid', group: 'Foundation' },
  ];
