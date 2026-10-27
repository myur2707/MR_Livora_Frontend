import { HttpErrorResponse } from '@angular/common/http';

/** Upper bound for a server-written message shown verbatim; longer text is not trusted as UI copy. */
const maxDetailLength = 600;

function apiErrorBody(error: unknown): { code: unknown; message: unknown } | null {
  const payload: unknown = error instanceof HttpErrorResponse ? error.error : null;
  const nested =
    typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
  if (typeof nested !== 'object' || nested === null) return null;
  return {
    code: 'code' in nested ? nested.code : null,
    message: 'message' in nested ? nested.message : null,
  };
}

export function apiErrorMessage(
  error: unknown,
  messages: Readonly<Record<string, string>>,
): string | undefined {
  const code = apiErrorBody(error)?.code;
  return typeof code === 'string' && Object.hasOwn(messages, code) ? messages[code] : undefined;
}

/**
 * The server's own message, only for allowlisted codes whose message names the user's own
 * conflicting values (for example which wings already exist). Rendered with interpolation.
 */
export function apiErrorDetail(error: unknown, codes: ReadonlySet<string>): string | undefined {
  const body = apiErrorBody(error);
  return typeof body?.code === 'string' &&
    codes.has(body.code) &&
    typeof body.message === 'string' &&
    body.message.length <= maxDetailLength
    ? body.message
    : undefined;
}
