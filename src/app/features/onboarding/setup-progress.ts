import type { SocietyDetail } from '../../core/onboarding';

export type StepState = 'done' | 'next' | 'todo' | 'committee';
export interface SetupProgress {
  states: StepState[];
  /** Index of the first unfinished step, or -1 when every step is done. */
  next: number;
}

/** Steps from Residents onward are completed by the committee, not by the platform. */
export const firstCommitteeStep = 3;
const lifecycleDone = new Set(['ACTIVE', 'SUSPENDED']);

/** Which wizard steps are finished, so a returning user can see where they left off. */
export function setupProgress(detail: SocietyDetail, platform: boolean): SetupProgress {
  const { requirements: r, status } = detail;
  const live = lifecycleDone.has(status);
  const done = [
    status !== 'DRAFT',
    r.committee,
    r.buildings && r.flats,
    r.residents,
    r.maintenance,
    detail.reviewed || !!detail.verifiedAt || live,
    live,
  ].map((value) => value || live);
  const next = done.indexOf(false);
  const states = done.map((isDone, index): StepState => {
    if (isDone) return 'done';
    if (platform && index >= firstCommitteeStep) return 'committee';
    return index === next ? 'next' : 'todo';
  });
  return { states, next };
}

export const stepStateLabel: Readonly<Record<StepState, string>> = {
  done: 'Done',
  next: 'Continue here',
  todo: 'To do',
  committee: 'With committee',
};
