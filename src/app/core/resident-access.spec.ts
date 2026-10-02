import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { residentAccessError } from './resident-access';
describe('resident access error boundary', () => {
  it('does not echo token, SQL or arbitrary server diagnostics', () => {
    for (const code of [
      'RESIDENT_LINK_INVALID',
      'RESIDENT_ACCESS_CONFLICT',
      'OCCUPANCY_OVERLAP',
      'INVALID_REQUEST',
      'RATE_LIMITED',
      'NOT_FOUND',
      'INTERNAL_ERROR',
    ]) {
      const message = residentAccessError(
        new HttpErrorResponse({
          error: { error: { code, message: 'SQL token_hash private resident identity' } },
        }),
      );
      expect(message).not.toContain('SQL');
      expect(message).not.toContain('token_hash');
      expect(message).not.toContain('private resident identity');
    }
  });
  it('explains existing occupancy and intended-email recovery without account discovery', () => {
    expect(
      residentAccessError(
        new HttpErrorResponse({ error: { error: { code: 'OCCUPANCY_OVERLAP' } } }),
      ),
    ).toContain('existing occupancy');
    expect(
      residentAccessError(
        new HttpErrorResponse({ error: { error: { code: 'RESIDENT_LINK_INVALID' } } }),
      ),
    ).toContain('intended email');
  });
});
