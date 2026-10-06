import { Component, input } from '@angular/core';

const paths = {
  home: 'M3 10 12 3l9 7M5 9v12h14V9M9 21v-7h6v7',
  building: 'M4 21V3h10v18M14 9h6v12M2 21h20M7 7h4M7 11h4M7 15h4M17 13v2M17 17v2',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10',
  userPlus: 'M15 21a7 7 0 0 0-14 0M8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10M19 8v6M16 11h6',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  document: 'M6 2h8l4 4v16H6zM14 2v5h5M9 12h6M9 16h6',
  receipt: 'M5 3l2 1 2-1 2 1 2-1 2 1 2-1 2 1v18l-2-1-2 1-2-1-2 1-2-1-2 1-2-1zM8 9h8M8 13h8M8 17h5',
  wallet:
    'M3 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 8l14-5v3M16 12h5v4h-5a2 2 0 0 1 0-4',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  message: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4zM8 9h8M8 13h5',
  upload: 'M12 16V3M7 8l5-5 5 5M4 14v6h16v-6',
  settings: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5M14 4v4M6 10v4M11 16v4',
  calendar: 'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16',
  filePlus: 'M6 2h8l4 4v16H6zM14 2v5h5M9 14h6M12 11v6',
  alert: 'M12 3 2 21h20zM12 9v5M12 18v.01',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  refresh: 'M20 11a8 8 0 1 0 1 4M20 5v6h-6',
  left: 'm14 6-6 6 6 6',
  right: 'm10 6 6 6-6 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  moon: 'M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10',
  sun: 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  check: 'm5 12 4 4L19 6',
  shield: 'M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7zM8 12l3 3 5-6',
  sparkle: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  info: 'M12 11v6M12 7v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  logout:
    'M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v2M11 17v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2',
  expand: 'M3 3h18v18H3zM16 3v18M8 8l4 4-4 4',
  collapse: 'M3 3h18v18H3zM8 3v18m8-13-4 4 4 4',
} as const;
export type IconName = keyof typeof paths;

@Component({
  selector: 'se-icon',
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="paths[name()]" /></svg>',
  host: { 'aria-hidden': 'true', class: 'icon' },
})
export class IconComponent {
  readonly name = input.required<IconName>();
  protected readonly paths = paths;
}
