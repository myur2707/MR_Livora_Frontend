import { describe, expect, it } from 'vitest';
import { parseFlatNumbers } from './flat-numbers';
describe('flat-number plans', () => {
  it('allows 200 row houses while retaining the 100-flat limit and rejecting oversized lists', () => {
    expect(parseFlatNumbers('1-200', 'rowHouses').numbers).toHaveLength(200);
    expect(parseFlatNumbers('001-200', 'rowHouses').numbers.at(-1)).toBe('200');
    const individualNumbers = Array.from(
      { length: 200 },
      (_, n) => 'H'.repeat(29) + String(n).padStart(3, '0'),
    ).join(',');
    expect(parseFlatNumbers(individualNumbers, 'rowHouses').numbers).toHaveLength(200);
    for (const input of ['1-201', '1-200,201', '1-200,200', 'a'.repeat(8001)]) {
      expect(parseFlatNumbers(input, 'rowHouses').error).not.toBeNull();
      expect(parseFlatNumbers(input, 'rowHouses').numbers).toEqual([]);
    }
    expect(parseFlatNumbers('1-101').error).not.toBeNull();
  });
  it('expands separate ranges and manual entries in order', () => {
    expect(parseFlatNumbers('101-103, 201\u2013202\n301, PH-1')).toEqual({
      numbers: ['101', '102', '103', '201', '202', '301', 'PH-1'],
      error: null,
    });
    expect(parseFlatNumbers('001-003').numbers).toEqual(['001', '002', '003']);
    expect(parseFlatNumbers('99-101').numbers).toEqual(['99', '100', '101']);
  });
  it('rejects descending, overlapping, duplicate and oversized ranges without a partial plan', () => {
    for (const input of [
      '110-101',
      '1-101',
      '1-3,3-5',
      'PH-1,ph-1',
      '01-3',
      '',
      '1'.repeat(33) + '-2',
      'a'.repeat(4001),
      'bad\u0000',
    ]) {
      const result = parseFlatNumbers(input);
      expect(result.error).not.toBeNull();
      expect(result.numbers).toEqual([]);
    }
    expect(parseFlatNumbers('1-100').numbers).toHaveLength(100);
    expect(parseFlatNumbers('1-100,101').error).not.toBeNull();
  });
});
