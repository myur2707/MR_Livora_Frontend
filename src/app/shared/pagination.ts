import { Component, computed, input, output } from '@angular/core';
import { ButtonDirective } from './button';
import { IconComponent } from './icon';

export function pageRange(
  total: number,
  page: number,
  size: number,
): { page: number; pages: number; from: number; to: number } {
  if (
    !Number.isInteger(total) ||
    total < 0 ||
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(size) ||
    size < 1
  )
    throw new RangeError('Pagination expects nonnegative total and positive integer page/size.');
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pages);
  return {
    page: current,
    pages,
    from: total ? (current - 1) * size + 1 : 0,
    to: Math.min(current * size, total),
  };
}

@Component({
  selector: 'se-pagination',
  imports: [ButtonDirective, IconComponent],
  template: `<nav class="pagination" aria-label="Table pages">
    <span>{{ range().from }}–{{ range().to }} of {{ total() }}</span>
    <div>
      <button
        seButton
        variant="secondary"
        type="button"
        aria-label="Previous page"
        [disabled]="range().page <= 1"
        (click)="pageSelected.emit(range().page - 1)"
      >
        <se-icon name="left" />
      </button>
      <span aria-live="polite">Page {{ range().page }} of {{ range().pages }}</span>
      <button
        seButton
        variant="secondary"
        type="button"
        aria-label="Next page"
        [disabled]="range().page >= range().pages"
        (click)="pageSelected.emit(range().page + 1)"
      >
        <se-icon name="right" />
      </button>
    </div>
  </nav>`,
})
export class PaginationComponent {
  readonly total = input.required<number>();
  readonly page = input(1);
  readonly pageSize = input(5);
  readonly pageSelected = output<number>();
  readonly range = computed(() => pageRange(this.total(), this.page(), this.pageSize()));
}
