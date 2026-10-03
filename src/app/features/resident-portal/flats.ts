import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResidentPortalApi } from '../../core/resident-portal';
import type { ResidentFlat } from '../../core/resident-portal';
import type { Page } from '../../core/onboarding';
import { CardComponent } from '../../shared/card';
import { PaginationComponent } from '../../shared/pagination';
import { FormNoticeComponent } from '../../shared/field';
import { ResidentView } from './view';
@Component({
  selector: 'se-resident-flats',
  imports: [RouterLink, CardComponent, PaginationComponent, FormNoticeComponent],
  templateUrl: './flats.html',
})
export class ResidentFlatsPage {
  private readonly api = inject(ResidentPortalApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly list = new ResidentView<Page<ResidentFlat>>();
  protected readonly detail = new ResidentView<ResidentFlat>();
  protected id: string | null = null;
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((params) => {
      this.id = params.get('id');
      void this.load();
    });
  }
  protected load(page = 1): Promise<void> {
    return this.id
      ? this.detail.load(() => this.api.get<ResidentFlat>('flats/' + this.id))
      : this.list.load(() => this.api.list<ResidentFlat>('flats', page));
  }
}
