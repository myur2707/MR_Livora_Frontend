import { describe, expect, it } from 'vitest';
import { parseWingCodes } from './wing-codes';
describe('multiple wing plans', () => {
  it('combines selected wings and custom codes, preserving order', () => {
    expect(parseWingCodes(['A', 'B'], ' C, EAST\nF ')).toEqual({
      codes: ['A', 'B', 'C', 'EAST', 'F'],
      error: null,
    });
  });
  it('rejects empty, duplicate, overlong and oversized plans', () => {
    for (const [selected, custom] of [
      [[], ''],
      [['A'], 'a'],
      [[], 'x'.repeat(65)],
      [[], 'bad\u0000'],
      [Array.from({ length: 11 }, (_, i) => String(i)), ''],
    ] as const) {
      const plan = parseWingCodes(selected, custom);
      expect(plan.error).not.toBeNull();
      expect(plan.codes).toEqual([]);
    }
  });
});
