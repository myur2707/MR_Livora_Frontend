/** Structure facts recorded with a setup event (wing codes and flat or row house numbers). */
export interface WingDetail {
  code: string;
  existing: boolean;
  added: string[];
  skipped: string[];
}
export type StructureDetails =
  | { kind: 'wings'; wings: WingDetail[] }
  | { kind: 'row_houses'; added: string[]; skipped: string[] };

/** Longest run of compacted numbers shown before summarising the rest. */
const shownParts = 6;

/**
 * "101, 102, 103, 105" → "101–103, 105". Only plain numbers in entry order are joined, so
 * codes such as 101A or 001 next to 1 are listed as entered.
 */
export function compactNumbers(values: string[]): string {
  const parts: string[] = [];
  let start = 0;
  for (let index = 1; index <= values.length; index++) {
    const previous = values[index - 1] ?? '';
    const current = values[index];
    const continues =
      current !== undefined &&
      /^[1-9]\d*$/.test(previous) &&
      /^[1-9]\d*$/.test(current) &&
      Number(current) === Number(previous) + 1;
    if (continues) continue;
    const first = values[start] ?? '';
    parts.push(index - 1 > start ? first + '–' + previous : first);
    start = index;
  }
  const rest = parts.length - shownParts;
  return parts.slice(0, shownParts).join(', ') + (rest > 0 ? ' and ' + rest + ' more' : '');
}

const count = (n: number, one: string): string => n + ' ' + (n === 1 ? one : one + 's');

function changeLine(
  label: string,
  added: string[],
  skipped: string[],
  kind: 'flat' | 'row house',
): string {
  const parts: string[] = [];
  if (added.length)
    parts.push(count(added.length, kind) + ' added (' + compactNumbers(added) + ')');
  if (skipped.length)
    parts.push(
      count(skipped.length, kind) + ' skipped as already added (' + compactNumbers(skipped) + ')',
    );
  return label + ': ' + (parts.join('; ') || 'no changes');
}

/** One readable line per wing, or one for row houses. */
export function describeStructure(details: StructureDetails): string[] {
  if (details.kind === 'row_houses')
    return [changeLine('Row houses', details.added, details.skipped, 'row house')];
  return details.wings.map((wing) =>
    changeLine(
      'Wing ' + wing.code + (wing.existing ? ' (existing)' : ' (new)'),
      wing.added,
      wing.skipped,
      'flat',
    ),
  );
}

/** A specific title for structure saves, in place of the generic "Building created". */
export function structureTitle(details: StructureDetails | null | undefined): string | null {
  if (!details) return null;
  return details.kind === 'row_houses' ? 'Row houses added' : 'Wings and flats added';
}
