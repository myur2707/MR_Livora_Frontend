import type { AddedNumbers, SocietyDetail, WingResult } from '../../core/onboarding';

const plural = (count: number, one: string): string =>
  count + ' ' + (count === 1 ? one : one + 's');

/** "1 wing · 20 flats · 50 row houses", leaving out kinds that have none. */
export function structureSummary(counts: SocietyDetail['counts']): string {
  const parts = [
    { count: counts.buildings, label: 'wing' },
    { count: counts.flats, label: 'flat' },
    { count: counts.rowHouses, label: 'row house' },
  ]
    .filter((part) => part.count > 0)
    .map((part) => plural(part.count, part.label));
  return parts.length ? parts.join(' · ') : 'No wings, flats or row houses yet';
}

export function residentSummary(count: number): string {
  return count ? plural(count, 'resident') + ' added' : 'No residents added yet';
}

/** At most this many skipped numbers are listed in a message. */
const listedLimit = 10;
function listed(values: string[]): string {
  const shown = values.slice(0, listedLimit);
  const rest = values.length - shown.length;
  return shown.join(', ') + (rest > 0 ? ' and ' + rest + ' more' : '');
}
function skippedNote(skipped: string[]): string {
  return skipped.length
    ? ' Skipped ' +
        skipped.length +
        (skipped.length === 1 ? ' that already exists: ' : ' that already exist: ') +
        listed(skipped) +
        '.'
    : '';
}
export function wingSavedMessage(wing: WingResult): string {
  const flats = plural(wing.added.length, 'flat');
  const main = wing.existing
    ? flats + ' added to wing ' + wing.code + '.'
    : 'Wing ' + wing.code + ' added with ' + flats + '.';
  return main + skippedNote(wing.skipped);
}
export function wingsSavedMessage(wings: WingResult[]): string {
  const changed = wings.filter((wing) => wing.added.length);
  const added = changed.reduce((total, wing) => total + wing.added.length, 0);
  const skipped = wings
    .filter((wing) => wing.skipped.length)
    .map((wing) => 'wing ' + wing.code + ' (' + listed(wing.skipped) + ')');
  return (
    plural(added, 'flat') +
    ' added across ' +
    plural(changed.length, 'wing') +
    '.' +
    (skipped.length ? ' Skipped flats that already exist in ' + skipped.join(', ') + '.' : '')
  );
}
export function rowHousesSavedMessage(result: AddedNumbers): string {
  return plural(result.added.length, 'row house') + ' added.' + skippedNote(result.skipped);
}
