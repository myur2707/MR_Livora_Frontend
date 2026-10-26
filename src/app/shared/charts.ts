import { Component, computed, input } from '@angular/core';
import { TableDirective } from './table';

export interface BarItem {
  label: string;
  value: number;
}
export interface ChartSeries {
  name: string;
  values: readonly number[];
  /** Exact display text per value (money stays a decimal string, never a rounded float). */
  labels: readonly string[];
}
export type ChartUnit = 'count' | 'money';

const compactMoney = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const GRID_STEPS = 4;

/** Axis tick text: whole counts, or compact rupees (₹0 / ₹5K / ₹1.2L-style compact). */
export function chartTick(value: number, unit: ChartUnit): string {
  return unit === 'money' ? '₹' + compactMoney.format(value) : String(value);
}
/** Rounds an axis step to 1/2/2.5/5 × 10ⁿ so gridlines land on clean numbers. */
export function niceStep(raw: number, unit: ChartUnit): number {
  if (raw <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const step =
    (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) *
    power;
  return unit === 'count' ? Math.max(1, Math.ceil(step)) : step;
}

/** Horizontal bars for counts by category; every row carries its value and share at the tip. */
@Component({
  selector: 'se-bar-list',
  template: `<ul class="bar-list" [attr.aria-label]="label()">
    @for (row of rows(); track row.label) {
      <li class="bar-row">
        <span class="bar-label">{{ row.label }}</span>
        <span class="bar-track" aria-hidden="true"
          ><span class="bar-fill" [style.width.%]="row.width"></span
        ></span>
        <span class="bar-value"
          >{{ row.value }}<span class="bar-share"> · {{ row.share }}%</span></span
        >
      </li>
    }
  </ul>`,
})
export class BarListComponent {
  readonly items = input.required<readonly BarItem[]>();
  readonly label = input.required<string>();
  protected readonly rows = computed(() => {
    const items = this.items();
    const max = Math.max(1, ...items.map((item) => item.value));
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return items.map((item) => ({
      ...item,
      width: (item.value / max) * 100,
      share: total ? Math.round((item.value / total) * 100) : 0,
    }));
  });
}

/**
 * Columns over an ordered category axis (periods, months). Two series stack with a 2px gap.
 * Values appear in a hover/focus tooltip and in the data table, so nothing depends on colour.
 */
@Component({
  selector: 'se-column-chart',
  imports: [TableDirective],
  template: `<figure class="column-chart">
    @if (series().length > 1) {
      <ul class="chart-legend" aria-label="Legend">
        @for (item of series(); track item.name; let index = $index) {
          <li><span class="chart-key" [attr.data-series]="index + 1"></span>{{ item.name }}</li>
        }
      </ul>
    }
    <div class="chart-plot" role="group" [attr.aria-label]="label()">
      <div class="chart-grid" aria-hidden="true">
        @for (tick of ticks(); track tick.value) {
          <span class="chart-gridline" [style.bottom.%]="tick.position"
            ><span class="chart-tick">{{ tick.text }}</span></span
          >
        }
      </div>
      <div class="chart-columns" role="list">
        @for (column of columns(); track column.category; let last = $last) {
          <div class="chart-column" role="listitem" tabindex="0" [attr.aria-label]="column.summary">
            <div class="chart-stack" [style.height.%]="column.height">
              @if (last && column.total > 0) {
                <span class="chart-cap" aria-hidden="true">{{ column.capLabel }}</span>
              }
              @for (segment of column.segments; track segment.series) {
                @if (segment.share > 0) {
                  <span
                    class="chart-segment"
                    [attr.data-series]="segment.series"
                    [style.flex-grow]="segment.share"
                  ></span>
                }
              }
            </div>
            <div class="chart-tip" role="presentation">
              <strong>{{ column.category }}</strong>
              @for (segment of column.segments; track segment.series) {
                <span
                  ><span class="chart-key" [attr.data-series]="segment.series"></span
                  >{{ segment.text }}<small>{{ segment.name }}</small></span
                >
              }
            </div>
          </div>
        }
      </div>
    </div>
    <div class="chart-axis" aria-hidden="true">
      @for (category of categories(); track category) {
        <span>{{ category }}</span>
      }
    </div>
    <details class="chart-table">
      <summary>View data table</summary>
      <div class="table-scroll" tabindex="0" role="region" [attr.aria-label]="label() + ' data'">
        <table seTable>
          <thead>
            <tr>
              <th scope="col">{{ categoryLabel() }}</th>
              @for (item of series(); track item.name) {
                <th scope="col">{{ item.name }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (category of categories(); track category; let row = $index) {
              <tr>
                <th scope="row">{{ category }}</th>
                @for (item of series(); track item.name) {
                  <td>{{ item.labels[row] }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </details>
  </figure>`,
})
export class ColumnChartComponent {
  readonly categories = input.required<readonly string[]>();
  readonly series = input.required<readonly ChartSeries[]>();
  readonly label = input.required<string>();
  readonly categoryLabel = input('Period');
  readonly unit = input<ChartUnit>('count');
  private readonly scale = computed(() => {
    const totals = this.categories().map((_, index) =>
      this.series().reduce((sum, item) => sum + Math.max(0, item.values[index] ?? 0), 0),
    );
    const step = niceStep(Math.max(...totals, 0) / GRID_STEPS, this.unit());
    return { totals, top: step * GRID_STEPS, step };
  });
  protected readonly ticks = computed(() => {
    const { top, step } = this.scale();
    return Array.from({ length: GRID_STEPS + 1 }, (_, index) => ({
      value: index * step,
      position: ((index * step) / top) * 100,
      text: chartTick(index * step, this.unit()),
    }));
  });
  protected readonly columns = computed(() => {
    const { totals, top } = this.scale();
    return this.categories().map((category, index) => {
      const total = totals[index] ?? 0;
      const segments = this.series().map((item, seriesIndex) => ({
        series: seriesIndex + 1,
        name: item.name,
        share: Math.max(0, item.values[index] ?? 0),
        text: item.labels[index] ?? '',
      }));
      return {
        category,
        total,
        height: top ? (total / top) * 100 : 0,
        capLabel: chartTick(total, this.unit()),
        segments,
        summary: category + ': ' + segments.map((s) => s.name + ' ' + s.text).join(', '),
      };
    });
  });
}
