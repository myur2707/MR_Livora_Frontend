import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiIdService {
  private sequence = 0;
  next(prefix: string): string {
    return `se-${prefix}-${++this.sequence}`;
  }
}
