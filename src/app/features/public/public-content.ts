import type { IconName } from '../../shared/icon';

/* Marketing copy for the public pages. It must describe only features the app already has. */

export interface PublicFeature {
  readonly icon: IconName;
  readonly title: string;
  readonly summary: string;
  readonly points: readonly string[];
}

export interface PublicItem {
  readonly icon: IconName;
  readonly title: string;
  readonly text: string;
}

export const FEATURES: readonly PublicFeature[] = [
  {
    icon: 'sparkle',
    title: 'Society onboarding',
    summary: 'Set up a society, flat or township and hand it over to its committee.',
    points: ['Guided setup wizard', 'Committee invitation', 'Verification before activation'],
  },
  {
    icon: 'building',
    title: 'Property and residents',
    summary: 'Buildings, wings, flats and row houses with complete resident records.',
    points: ['Occupancy history', 'Owners, tenants and family members', 'CSV import'],
  },
  {
    icon: 'userPlus',
    title: 'Resident access',
    summary: 'Residents verify their email and request membership; the committee approves.',
    points: ['Email verification', 'Membership requests', 'Committee-managed access'],
  },
  {
    icon: 'receipt',
    title: 'Maintenance billing',
    summary: 'Configure charges, open billing periods and issue bills after a review.',
    points: ['Charge configuration', 'Bill preview before issue', 'Outstanding report'],
  },
  {
    icon: 'wallet',
    title: 'Payments and receipts',
    summary: 'Record full or partial payments, including cash collected by the committee.',
    points: ['Printable receipts', 'Refunds and corrections with history', 'Collection report'],
  },
  {
    icon: 'home',
    title: 'Resident portal',
    summary: 'Every resident gets one simple place for everything about their home.',
    points: ['Flats and bills', 'Payment history and receipts', 'Notices and complaints'],
  },
  {
    icon: 'message',
    title: 'Notices and complaints',
    summary: 'The committee publishes notices; residents raise and track complaints.',
    points: ['Published notices', 'Complaint assignment', 'Status updates until resolved'],
  },
  {
    icon: 'chart',
    title: 'Reports and dashboards',
    summary: 'A clear committee dashboard with financial and resident reports.',
    points: ['Committee dashboard', 'Financial and resident reports', 'CSV export'],
  },
];

export const STEPS: readonly PublicItem[] = [
  {
    icon: 'sparkle',
    title: 'Your society is set up',
    text: 'Mr. Livora creates your society, flat or township and invites the committee.',
  },
  {
    icon: 'shield',
    title: 'The committee takes charge',
    text: 'The committee verifies the details, activates the society and adds residents.',
  },
  {
    icon: 'people',
    title: 'Residents join in',
    text: 'Residents verify their email, request membership and manage everything online.',
  },
];

export const AUDIENCES: readonly PublicItem[] = [
  {
    icon: 'people',
    title: 'Committee admins',
    text: 'Run properties, residents, access, notices and complaints from one workspace.',
  },
  {
    icon: 'wallet',
    title: 'Accountants and staff',
    text: 'Issue bills, record payments and keep every rupee traceable with clear reports.',
  },
  {
    icon: 'home',
    title: 'Owners and tenants',
    text: 'See your bills, receipts and notices, and raise complaints from any device.',
  },
];

export const TRUST: readonly PublicItem[] = [
  { icon: 'shield', title: 'Secure sign-in', text: 'Protected sessions and verified email.' },
  { icon: 'user', title: 'Role-based access', text: 'People see only what their role allows.' },
  { icon: 'receipt', title: 'Private finances', text: 'Financial history is kept, never erased.' },
  { icon: 'grid', title: 'Web and mobile', text: 'Install it on your phone or desktop.' },
];

export const VALUES: readonly PublicItem[] = [
  {
    icon: 'receipt',
    title: 'Transparency',
    text: 'Bills, payments and corrections leave a clear, permanent trail.',
  },
  {
    icon: 'shield',
    title: 'Privacy',
    text: 'Residents see their own records; financial data stays with the committee.',
  },
  {
    icon: 'sparkle',
    title: 'Simplicity',
    text: 'Everyday society tasks in a few calm, obvious steps.',
  },
  {
    icon: 'people',
    title: 'Community',
    text: 'Notices and complaints keep neighbours and the committee connected.',
  },
];

export const CONTACT = {
  phone: '+91 9157379787',
  phoneHref: 'tel:+919157379787',
  email: 'mrlivora.official@gmail.com',
  social: 'mrlivora.official',
  instagram: 'https://www.instagram.com/mrlivora.official',
  facebook: 'https://www.facebook.com/mrlivora.official',
} as const;
