import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { paymentMinor, paymentMoney, paymentError } from './payments';
describe('payment values and safe errors', () => {
  it('retains exact cents and rejects ambiguous amounts', () => {
    expect(paymentMoney((paymentMinor('0.1') ?? 0n) + (paymentMinor('0.2') ?? 0n))).toBe('0.30');
    expect(paymentMoney(paymentMinor('9999999999.99') ?? 0n)).toBe('9999999999.99');
    expect(paymentMoney(-10n)).toBe('-0.10');
    for (const value of ['1.001', '1e2', '-1', 'NaN', '10000000000.00'])
      expect(paymentMinor(value)).toBeNull();
  });
  it('shows safe conflict messages without reflecting server internals', () => {
    expect(
      paymentError(
        new HttpErrorResponse({
          status: 409,
          error: { error: { code: 'OVERPAYMENT', message: 'private SQL' } },
        }),
      ),
    ).toContain('outstanding');
    expect(
      paymentError(new HttpErrorResponse({ status: 500, error: { message: 'private SQL' } })),
    ).not.toContain('SQL');
  });
});
