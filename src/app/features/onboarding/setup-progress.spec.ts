import { describe, expect, it } from 'vitest';
import type { SocietyDetail } from '../../core/onboarding';
import { setupProgress } from './setup-progress';

const base: SocietyDetail = {
  id: '3',
  code: 'SOC-00001',
  name: 'Synthetic',
  timezone: 'Asia/Kolkata',
  status: 'SETUP_IN_PROGRESS',
  revision: '7',
  verifiedAt: null,
  verifierMembershipId: null,
  reviewed: false,
  reviewedAt: null,
  counts: { buildings: 2, flats: 17, rowHouses: 50, residents: 0, maintenance: 0 },
  requirements: {
    committee: true,
    buildings: true,
    flats: true,
    residents: false,
    maintenance: false,
  },
  invitation: null,
  events: [],
  structureAccess: { allowed: false, grantedAt: null, revokedAt: null },
  supportContact: {
    phone: '+91 0000000000',
    phoneHref: 'tel:+910000000000',
    email: 'support@example.test',
  },
};

describe('setup progress', () => {
  it('marks finished steps and the first unfinished one for the committee', () => {
    expect(setupProgress(base, false)).toEqual({
      states: ['done', 'done', 'done', 'next', 'todo', 'todo', 'todo'],
      next: 3,
    });
  });
  it('shows committee-owned steps as with the committee for the platform', () => {
    expect(setupProgress(base, true).states).toEqual([
      'done',
      'done',
      'done',
      'committee',
      'committee',
      'committee',
      'committee',
    ]);
    const draft = { ...base, status: 'DRAFT' as const };
    expect(setupProgress(draft, true).states[0]).toBe('next');
    const noCommittee = { ...base, requirements: { ...base.requirements, committee: false } };
    expect(setupProgress(noCommittee, true)).toMatchObject({ next: 1 });
  });
  it('treats a live society as fully set up', () => {
    const active = { ...base, status: 'ACTIVE' as const };
    expect(setupProgress(active, false)).toEqual({
      states: Array<string>(7).fill('done'),
      next: -1,
    });
  });
});
