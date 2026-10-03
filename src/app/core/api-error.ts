import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(
  error: unknown,
  messages: Readonly<Record<string, string>>,
): string | undefined {
  const payload: unknown = error instanceof HttpErrorResponse ? error.error : null;
  const nested =
    typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
  const code =
    typeof nested === 'object' && nested !== null && 'code' in nested ? nested.code : null;
  return typeof code === 'string' && Object.hasOwn(messages, code) ? messages[code] : undefined;
}
