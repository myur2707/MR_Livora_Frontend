import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ThemeService } from '../../core/theme';
import { ButtonDirective } from '../../shared/button';
import { BadgeComponent } from '../../shared/badge';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'se-auth-placeholder',
  imports: [RouterLink, ButtonDirective, BadgeComponent, IconComponent],
  templateUrl: './auth-placeholder.html',
})
export class AuthPlaceholderComponent {
  protected readonly reset = inject(ActivatedRoute).snapshot.data['mode'] === 'reset';
  protected readonly theme = inject(ThemeService);
}
