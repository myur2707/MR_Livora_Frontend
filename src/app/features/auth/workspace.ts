import { friendlyLabel } from '../../shared/label';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authErrorMessage } from '../../core/auth';
import { ButtonDirective } from '../../shared/button';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { StateComponent } from '../../shared/state';
import type { SocietyAccess } from '../../core/auth-state';

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
        <p class="eyebrow">COMMITTEE WORKSPACE</p>
        <h1 tabindex="-1">Choose your workspace</h1>
        <p>
          Select the society you want to manage. Your available tools follow your committee role.
        </p>
      </div>
      <div class="page-heading-actions">
        <a seButton variant="secondary" routerLink="/join-society">Request society access</a>
      </div>
    </header>
    <se-form-notice [message]="error()" />
    @if (auth.state.identity(); as identity) {
      @if (identity.platformAdmin) {
        <section class="card platform-workspace" aria-labelledby="platform-workspace-title">
          <div>
            <p class="eyebrow">PLATFORM ADMIN</p>
            <h2 id="platform-workspace-title">Platform workspace</h2>
            <p>Manage Societies/Flats/Townships, review onboarding, and track setup progress.</p>
          </div>
          <div class="platform-workspace-actions">
            <a seButton routerLink="/platform/dashboard">Open platform workspace</a>
            <a seButton variant="secondary" routerLink="/platform/societies"
              >View Societies/Flats/Townships</a
            >
          </div>
        </section>
      }
      @if (identity.setupSocieties?.length) {
        <section class="card setup-workspaces" aria-labelledby="setup-workspaces-title">
          <div class="workspace-section-heading">
            <div class="workspace-section-icon" aria-hidden="true">✓</div>
            <div>
              <p class="eyebrow">ACTION REQUIRED</p>
              <h2 id="setup-workspaces-title">Complete society setup</h2>
              <p>Finish the required details before your committee starts managing the society.</p>
            </div>
          </div>
          <div class="setup-workspace-list">
            @for (society of identity.setupSocieties; track society.societyId) {
              <article class="setup-workspace-item">
                <div>
                  <strong>{{ society.name }}</strong>
                  <span>Setup in progress</span>
                </div>
                <a
                  seButton
                  variant="secondary"
                  [routerLink]="['/onboarding/societies', society.societyId]"
                  >Continue setup</a
                >
              </article>
            }
          </div>
        </section>
      }
      @if (identity.memberships.length) {
        <section class="card community-workspaces" aria-labelledby="community-workspaces-title">
          <div class="workspace-section-heading">
            <div class="workspace-section-icon" aria-hidden="true">⌂</div>
            <div>
              <p class="eyebrow">YOUR COMMUNITIES</p>
              <h2 id="community-workspaces-title">Committee access</h2>
              <p>{{ membershipSummary(identity.memberships) }}</p>
            </div>
          </div>
          <div class="community-access-list" aria-label="Available committee access">
            @for (membership of identity.memberships; track membership.societyId) {
              <article class="community-access-item">
                <div class="community-access-mark" aria-hidden="true">
                  {{ membershipInitials(membership.name) }}
                </div>
                <div class="community-access-details">
                  <h3>{{ membership.name }}</h3>
                  <p>{{ roleGuidance(membership.roles) }}</p>
                  <div class="community-role-list" aria-label="Your roles">
                    @for (role of membership.roles; track role) {
                      <span class="community-role">{{ roleNames([role]) }}</span>
                    }
                  </div>
                </div>
              </article>
            }
          </div>
          <form
            class="workspace-form"
            novalidate
            (submit)="select($event, selection.value, selection)"
          >
            <se-field
              controlId="workspace-society"
              label="Community"
              [required]="true"
              [error]="choiceError()"
            >
              <select seSelect #selection required (change)="choiceError.set(null)">
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
        </section>
      } @else if (!identity.platformAdmin) {
        <section class="card workspace-empty-state" aria-label="Community access status">
          <se-state
            kind="empty"
            title="No active committee access"
            message="Request access to a society, or contact its committee administrator if you are waiting for approval."
          />
          <a seButton routerLink="/join-society">Request society access</a>
        </section>
      }
    }`,
})
export class WorkspaceComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly choiceError = signal<string | null>(null);
  protected roleNames(roles: readonly string[]): string {
    return roles.map((role) => friendlyLabel(role)).join(', ');
  }
  protected membershipSummary(memberships: readonly SocietyAccess[]): string {
    const communityWord = memberships.length === 1 ? 'community' : 'communities';
    return `${memberships.length} ${communityWord} available. Choose one below to continue.`;
  }
  protected roleGuidance(roles: readonly string[]): string {
    if (roles.includes('COMMITTEE_ADMIN')) {
      return 'Full committee administration and society operations.';
    }
    if (roles.includes('COMMITTEE_MEMBER')) {
      return 'Committee tools available within your assigned permissions.';
    }
    return 'Your available tools are based on this membership.';
  }
  protected membershipInitials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }
  protected async select(
    event: Event,
    societyId: string,
    control: HTMLSelectElement,
  ): Promise<void> {
    event.preventDefault();
    if (!societyId) {
      this.choiceError.set('Choose the community you want to open.');
      control.focus();
      return;
    }
    if (this.busy()) return;
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
