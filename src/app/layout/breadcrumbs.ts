import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { IconComponent } from '../shared/icon';

@Component({
  selector: 'se-breadcrumbs',
  imports: [RouterLink, IconComponent],
  template: `<nav aria-label="Breadcrumb">
    <ol class="breadcrumbs">
      @for (crumb of crumbs(); track crumb.url; let last = $last) {
        <li>
          @if (last) {
            <span aria-current="page">{{ crumb.label }}</span>
          } @else {
            <a [routerLink]="crumb.url">{{ crumb.label }}</a
            ><se-icon name="right" />
          }
        </li>
      }
    </ol>
  </nav>`,
})
export class BreadcrumbsComponent {
  private readonly router = inject(Router);
  protected readonly crumbs = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const result: { label: string; url: string }[] = [];
        let route = this.router.routerState.snapshot.root;
        let url = '';
        while (route.firstChild) {
          route = route.firstChild;
          url += '/' + route.url.map((segment) => segment.path).join('/');
          const label: unknown = route.data['breadcrumb'];
          if (typeof label === 'string') result.push({ label, url: url.replace(/\/+/g, '/') });
        }
        return result;
      }),
    ),
    { initialValue: [] },
  );
}
