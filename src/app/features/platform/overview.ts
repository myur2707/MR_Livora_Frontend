import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../../shared/button';
import { BadgeComponent } from '../../shared/badge';
import { CardComponent } from '../../shared/card';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'se-overview',
  imports: [RouterLink, ButtonDirective, BadgeComponent, CardComponent, IconComponent],
  templateUrl: './overview.html',
})
export class OverviewComponent {}
