import { billingError } from './billing';
import { HttpErrorResponse } from '@angular/common/http';
import type { Page } from './onboarding';
export const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'] as const;
export interface PaymentAllocation {
  billId: string;
  billNumber: string;
  amount: string;
  refunded: string;
}
export interface Payment {
  id: string;
  flatId: string;
  payerPersonId: string;
  collectedByUserId: string;
  recordedByUserId: string;
  method: string;
  paymentDate: string;
  amount: string;
  reference: string | null;
  notes: string | null;
  receiptNumber: string | null;
  issuedAt: string | null;
  recordedAt: string;
  societyName: string;
  currency: string;
  buildingCode: string;
  flatNumber: string;
  payerName: string;
  collectorName: string | null;
  recorderName: string | null;
  legacyReceipt: number;
  status: string;
  refunded: string;
  netAmount: string;
  allocations: PaymentAllocation[];
  refunds: {
    id: string;
    amount: string;
    operationDate: string;
    method: string;
    reason: string;
    reference: string | null;
  }[];
  reversal: { reason: string; operationDate: string; replacementPaymentId: string | null } | null;
  correctedFromPaymentId: string | null;
}
export interface PaymentResult {
  paymentId: string;
  replacementPaymentId?: string;
  refundId?: string;
  reversalId?: string;
  replayed: boolean;
}
export interface CollectionEvent {
  id: string;
  paymentId: string;
  kind: string;
  eventDate: string;
  method: string;
  amount: string;
  collectedByUserId: string;
  receiptNumber: string | null;
  reference: string | null;
}
export type CollectionReport = Page<CollectionEvent> & {
  summary: { collections: string; refunds: string; reversals: string; netRecorded: string };
};
export function paymentMinor(value: string): bigint | null {
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole = '', cents = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(cents.padEnd(2, '0'));
}
export function paymentMoney(value: bigint): string {
  const negative = value < 0n,
    n = negative ? -value : value;
  return (negative ? '-' : '') + String(n / 100n) + '.' + String(n % 100n).padStart(2, '0');
}
export function paymentError(error: unknown): string {
  const payload: unknown = error instanceof HttpErrorResponse ? error.error : null;
  const nested =
    typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
  const code =
    typeof nested === 'object' && nested !== null && 'code' in nested ? nested.code : null;
  switch (code) {
    case 'OVERPAYMENT':
      return 'An allocation exceeds the bill outstanding. Refresh bills before retrying.';
    case 'ALLOCATION_TOTAL':
      return 'Allocate the exact payment or refund amount to the selected bills.';
    case 'DUPLICATE_REFERENCE':
      return 'This transaction reference is already recorded. Review payment history.';
    case 'PAYMENT_STATE':
      return 'This action is unavailable for the payment’s current state or remaining amount.';
    case 'REFUND_ALLOCATION':
      return 'A refund exceeds the remaining original allocation.';
    case 'PAYMENT_DATE':
      return 'Payment dates cannot be in the future; returns cannot precede the payment.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'This request was already used. Review payment history before retrying.';
    default:
      return billingError(error);
  }
}
