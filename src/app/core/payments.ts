import { apiErrorMessage } from './api-error';
import { billingError } from './billing';
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
const paymentErrorMessages: Readonly<Record<string, string>> = {
  OVERPAYMENT: 'An allocation exceeds the bill outstanding. Refresh bills before retrying.',
  ALLOCATION_TOTAL: 'Allocate the exact payment or refund amount to the selected bills.',
  DUPLICATE_REFERENCE: 'This transaction reference is already recorded. Review payment history.',
  PAYMENT_STATE: 'This action is unavailable for the payment’s current state or remaining amount.',
  REFUND_ALLOCATION: 'A refund exceeds the remaining original allocation.',
  PAYMENT_DATE: 'Payment dates cannot be in the future; returns cannot precede the payment.',
  IDEMPOTENCY_CONFLICT: 'This request was already used. Review payment history before retrying.',
};
export function paymentError(error: unknown): string {
  return apiErrorMessage(error, paymentErrorMessages) ?? billingError(error);
}
