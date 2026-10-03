import { DestroyRef, effect, inject, signal } from '@angular/core';
import { AuthState } from '../../core/auth-state';
import { billingError } from '../../core/billing';
// A feature-local request lifecycle: private values disappear on identity/context loss,
// and late responses cannot repopulate a destroyed or switched resident page.
export class ResidentView<T> {
  readonly value = signal<T | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly auth = inject(AuthState);
  private version = 0;
  private alive = true;
  constructor() {
    let key = this.key();
    effect(() => {
      const current = this.key();
      if (current !== key) {
        key = current;
        this.reset();
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.alive = false;
      this.reset();
    });
  }
  private key(): string {
    const identity = this.auth.identity();
    return (identity?.userId ?? '') + ':' + (identity?.activeSociety?.societyId ?? '');
  }
  private reset(): void {
    this.version++;
    this.value.set(null);
    this.error.set(null);
    this.loading.set(false);
  }
  async load(work: () => Promise<T>): Promise<void> {
    const n = ++this.version,
      key = this.key();
    this.value.set(null);
    this.error.set(null);
    this.loading.set(true);
    const current = () => this.alive && n === this.version && key === this.key();
    try {
      const result = await work();
      if (current()) this.value.set(result);
    } catch (error) {
      if (current()) this.error.set(billingError(error));
    } finally {
      if (current()) this.loading.set(false);
    }
  }
}
