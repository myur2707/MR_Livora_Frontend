import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthState } from './auth-state';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // Only relative same-origin API requests receive cookies/CSRF. Never forward them to third parties.
  if (!request.url.startsWith('/api/v1/')) return next(request);
  const state = inject(AuthState);
  const token = state.csrf();
  const changing = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const headers = changing && token ? request.headers.set('X-CSRF-Token', token) : request.headers;
  return next(request.clone({ headers, withCredentials: true, cache: 'no-store' })).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.endsWith('/login')
      )
        state.identity.set(null);
      return throwError(() => error);
    }),
  );
};
