import { describe, expect, it } from 'vitest';
import { compactNumbers, describeStructure } from './setup-details';

describe('setup event details', () => {
  it('joins consecutive plain numbers and keeps codes as entered', () => {
    expect(compactNumbers(['101', '102', '103', '105'])).toBe('101–103, 105');
    expect(compactNumbers(['1'])).toBe('1');
    expect(compactNumbers(['001', '002', '101A', '101B'])).toBe('001, 002, 101A, 101B');
    expect(compactNumbers([])).toBe('');
    const scattered = Array.from({ length: 9 }, (_, n) => String(n * 10 + 1));
    expect(compactNumbers(scattered)).toBe('1, 11, 21, 31, 41, 51 and 3 more');
  });
  it('describes each wing and row house change in one line', () => {
    expect(
      describeStructure({
        kind: 'wings',
        wings: [
          {
            code: 'A',
            existing: true,
            added: ['106', '107', '108', '109', '110', '111'],
            skipped: ['101', '102', '103', '104', '105'],
          },
          { code: 'B', existing: false, added: ['101', '102'], skipped: [] },
        ],
      }),
    ).toEqual([
      'Wing A (existing): 6 flats added (106–111); 5 flats skipped as already added (101–105)',
      'Wing B (new): 2 flats added (101–102)',
    ]);
    expect(describeStructure({ kind: 'row_houses', added: ['1'], skipped: [] })).toEqual([
      'Row houses: 1 row house added (1)',
    ]);
  });
});
