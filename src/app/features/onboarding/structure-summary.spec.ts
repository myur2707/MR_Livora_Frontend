import { describe, expect, it } from 'vitest';
import {
  residentSummary,
  rowHousesSavedMessage,
  structureSummary,
  wingSavedMessage,
  wingsSavedMessage,
} from './structure-summary';
const none = { buildings: 0, flats: 0, rowHouses: 0, residents: 0, maintenance: 0 };
describe('setup structure summary', () => {
  it('names row houses separately and pluralises each kind', () => {
    expect(structureSummary({ ...none, rowHouses: 50 })).toBe('50 row houses');
    expect(structureSummary({ ...none, buildings: 1, flats: 1, rowHouses: 1 })).toBe(
      '1 wing · 1 flat · 1 row house',
    );
    expect(structureSummary({ ...none, buildings: 2, flats: 20 })).toBe('2 wings · 20 flats');
  });
  it('explains an empty setup instead of listing zeros', () => {
    expect(structureSummary(none)).toBe('No wings, flats or row houses yet');
    expect(residentSummary(0)).toBe('No residents added yet');
    expect(residentSummary(1)).toBe('1 resident added');
    expect(residentSummary(3)).toBe('3 residents added');
  });
  it('reports what was added and which existing numbers were skipped', () => {
    const wing = (code: string, existing: boolean, added: string[], skipped: string[]) => ({
      code,
      existing,
      added,
      skipped,
    });
    expect(wingSavedMessage(wing('A', false, ['101', '102'], []))).toBe(
      'Wing A added with 2 flats.',
    );
    expect(
      wingSavedMessage(
        wing(
          'A',
          true,
          ['106', '107', '108', '109', '110', '111'],
          ['101', '102', '103', '104', '105'],
        ),
      ),
    ).toBe('6 flats added to wing A. Skipped 5 that already exist: 101, 102, 103, 104, 105.');
    expect(
      wingsSavedMessage([
        wing('A', true, [], ['101', '102']),
        wing('B', false, ['101', '102'], []),
        wing('C', false, ['101', '102'], []),
      ]),
    ).toBe('4 flats added across 2 wings. Skipped flats that already exist in wing A (101, 102).');
    const many = Array.from({ length: 12 }, (_, n) => String(n + 1));
    expect(rowHousesSavedMessage({ added: ['13'], skipped: many })).toBe(
      '1 row house added. Skipped 12 that already exist: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 and 2 more.',
    );
  });
});
