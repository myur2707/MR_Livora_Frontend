import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from './api-error';

describe('client-owned API error messages', () => {
  it('uses only a known string code and never server text or inherited properties', () => {
    const messages = { CONFLICT: 'Refresh and try again.' };
    for (const payload of [
      null,
      'private SQL',
      {},
      { error: null },
      { error: { code: 1 } },
      { error: { code: '__proto__' } },
      { error: { code: 'constructor' } },
      { error: { code: 'UNKNOWN', message: 'private SQL' } },
    ])
      expect(apiErrorMessage(new HttpErrorResponse({ error: payload }), messages)).toBeUndefined();
    expect(apiErrorMessage(new Error('private SQL'), messages)).toBeUndefined();
    expect(
      apiErrorMessage(
        new HttpErrorResponse({ error: { error: { code: 'CONFLICT', message: 'private SQL' } } }),
        messages,
      ),
    ).toBe('Refresh and try again.');
  });
});
