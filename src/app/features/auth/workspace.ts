import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authErrorMessage } from '../../core/auth';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { StateComponent } from '../../shared/state';

@Component({
  selector: 'se-workspace',
  imports: [
    RouterLink,
    ButtonDirective,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    StateComponent,
  ],
  template: `<header class="page-heading">
      <div>
        <p class="eyebrow">WELCOME BACK</p>
        <h1 tabindex="-1">Choose your workspace</h1>
        <p>Access is based on your current membership.</p>
      </div>
    </header>
    <p class="workspace-membership-action">
      <a seButton variant="secondary" routerLink="/join-society"
        >Request another society membership</a
      >
    </p>
    <se-form-notice [message]="error()" />
    @if (auth.state.identity(); as identity) {
      @if (identity.platformAdmin) {
        <section class="card platform-workspace" aria-labelledby="platform-workspace-title">
          <div>
            <p class="eyebrow">PLATFORM ADMIN</p>
            <h2 id="platform-workspace-title">Platform workspace</h2>
            <p>
              Manage societies or flats or townships, review onboarding, and track setup progress.
            </p>
          </div>
          <div class="platform-workspace-actions">
            <a seButton routerLink="/platform/dashboard">Open platform workspace</a>
            <a seButton variant="secondary" routerLink="/platform/societies"
              >View societies or flats or townships</a
            >
          </div>
        </section>
      }
      @if (identity.setupSocieties?.length) {
        <section aria-label="Communities awaiting setup">
          <h2>Complete society setup</h2>
          @for (society of identity.setupSocieties; track society.societyId) {
            <p>
              <a
                seButton
                variant="secondary"
                [routerLink]="['/onboarding/societies', society.societyId]"
                >Set up {{ society.name }}</a
              >
            </p>
          }
        </section>
      }
      @if (identity.memberships.length) {
        <form class="workspace-form" (submit)="select($event, selection.value)">
          <se-field controlId="workspace-society" label="Community" [required]="true">
            <select seSelect #selection required>
              <option value="">Choose a community</option>
              @for (membership of identity.memberships; track membership.societyId) {
                <option [value]="membership.societyId">
                  {{ membership.name }} · {{ roleNames(membership.roles) }}
                </option>
              }
            </select>
          </se-field>
          <button seButton type="submit" [disabled]="busy()">
            {{ busy() ? 'Opening…' : 'Open community workspace' }}
          </button>
        </form>
      } @else if (!identity.platformAdmin) {
        <se-state
          kind="empty"
          title="No active community access"
          message="Contact your committee if you need access to a community."
        />
      }
    }`,
})
export class WorkspaceComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected roleNames(roles: readonly string[]): string {
    return roles
      .map((role) =>
        role
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' '),
      )
      .join(', ');
  }
  protected async select(event: Event, societyId: string): Promise<void> {
    event.preventDefault();
    if (!societyId || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.selectSociety(societyId);
      await this.router.navigateByUrl('/society/dashboard');
    } catch (error) {
      this.error.set(authErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
