import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { reportError } from './reports';
describe('report errors', () => {
  it('explains export limits and invalid ranges without reflecting private server errors', () => {
    expect(reportError(new HttpErrorResponse({ status: 422, error: 'Private SQL' }))).toContain(
      '5000',
    );
    expect(reportError(new HttpErrorResponse({ status: 400, error: 'Private SQL' }))).toContain(
      '366 days',
    );
    expect(reportError(new HttpErrorResponse({ status: 500, error: 'Private SQL' }))).not.toContain(
      'SQL',
    );
  });
});
