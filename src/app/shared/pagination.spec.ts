import { describe, expect, it } from 'vitest';
import { pageRange } from './pagination';

describe('pagination boundaries', () => {
  it('handles empty and partially filled pages', () => {
    expect(pageRange(0, 1, 5)).toEqual({ page: 1, pages: 1, from: 0, to: 0 });
    expect(pageRange(12, 3, 5)).toEqual({ page: 3, pages: 3, from: 11, to: 12 });
  });
  it('clamps a stale page when the result count decreases', () => {
    expect(pageRange(2, 4, 5)).toEqual({ page: 1, pages: 1, from: 1, to: 2 });
  });
  it('rejects invalid inputs instead of emitting invalid navigation', () => {
    for (const [total, page, size] of [
      [-1, 1, 5],
      [2, 0, 5],
      [2, 1, 0],
      [2, 1.5, 5],
    ] as const) {
      expect(() => pageRange(total, page, size)).toThrow(RangeError);
    }
  });
});
