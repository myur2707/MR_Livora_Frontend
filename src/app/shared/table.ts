import { Directive } from '@angular/core';

@Directive({ selector: 'table[seTable]', host: { class: 'data-table' } })
export class TableDirective {}
