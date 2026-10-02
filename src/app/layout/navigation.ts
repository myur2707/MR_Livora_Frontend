import type { IconName } from '../shared/icon';

export const NAVIGATION: readonly { label: string; path: string; icon: IconName; group: string }[] =
  [
    { label: 'Overview', path: '/platform/dashboard', icon: 'home', group: 'Workspace' },
    { label: 'Societies', path: '/platform/societies', icon: 'building', group: 'Workspace' },
    { label: 'Community space', path: '/society/dashboard', icon: 'people', group: 'Workspace' },
    { label: 'UI library', path: '/ui', icon: 'grid', group: 'Foundation' },
  ];
