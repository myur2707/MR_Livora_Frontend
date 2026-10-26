import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

/** An API code such as IN_PROGRESS or BANK_TRANSFER: capitals and digits joined by underscores. */
const CODE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
/** Words that stay upper case when a code is turned into prose. */
const ACRONYMS = new Set(['UPI', 'CSV', 'SMS', 'OTP', 'GST', 'ID', 'PDF']);

/**
 * Turns a stored code into display text: "IN_PROGRESS" → "In progress", "UPI" stays "UPI".
 * `enum` mode converts every all-caps code (statuses, types, methods); `code` mode only
 * converts identifiers that contain an underscore, so user-chosen codes like "A" or "SOC3"
 * keep their exact spelling while "ROW_HOUSES" reads "Row houses".
 * Values that are not codes (names, dates, receipt numbers) are returned unchanged.
 */
export function friendlyLabel(
  value: string | null | undefined,
  mode: 'enum' | 'code' = 'enum',
): string {
  if (!value) return '';
  if (!CODE.test(value) || (mode === 'code' && !value.includes('_'))) return value;
  return value
    .split('_')
    .map((word, index) => {
      if (ACRONYMS.has(word)) return word;
      const lower = word.toLowerCase();
      return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(' ');
}

@Pipe({ name: 'label' })
export class LabelPipe implements PipeTransform {
  transform(value: string | null | undefined, mode: 'enum' | 'code' = 'enum'): string {
    return friendlyLabel(value, mode);
  }
}

/** Audit action keys read as a sentence: "society.status_changed" → "Society status changed". */
export function eventLabel(action: string): string {
  const words = action.replace(/[._]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
