import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PropertyApi, propertyError, occupancyTypes } from '../../core/property';
import type { ManagedFlat, Occupancy } from '../../core/property';
import type { Page } from '../../core/onboarding';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { TableDirective } from '../../shared/table';
import { DialogComponent } from '../../shared/dialog';
import { PaginationComponent } from '../../shared/pagination';
import { StateComponent } from '../../shared/state';
import { ResourcePicker } from './picker';
@Component({
  selector: 'se-flat-detail',
  imports: [
    FormsModule,
    RouterLink,
    ButtonDirective,
    CardComponent,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    TableDirective,
    DialogComponent,
    PaginationComponent,
    StateComponent,
    ResourcePicker,
  ],
  templateUrl: './flat-detail.html',
})
export class FlatDetail implements OnInit {
  private readonly api = inject(PropertyApi);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly flat = signal<ManagedFlat | null>(null);
  protected readonly current = signal<Page<Occupancy> | null>(null);
  protected readonly history = signal<Page<Occupancy> | null>(null);
  protected readonly all = signal<Page<Occupancy> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(false);
  protected readonly showForm = signal(false);
  protected readonly closing = signal<Occupancy | null>(null);
  protected readonly types = occupancyTypes;
  protected personId = '';
  protected occupancyType = 'TENANT';
  protected startsOn = '';
  protected endsOn = '';
  protected closeDate = '';
  ngOnInit(): void {
    void this.load();
  }
  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.flat.set(await this.api.get<ManagedFlat>('flats/' + this.id));
      await Promise.all([
        this.loadRecords('current'),
        this.loadRecords('history'),
        this.loadRecords('all'),
      ]);
    } catch (e) {
      this.flat.set(null);
      this.current.set(null);
      this.history.set(null);
      this.all.set(null);
      this.error.set(propertyError(e));
    } finally {
      this.loading.set(false);
    }
  }
  protected async loadRecords(filter: 'current' | 'history' | 'all', page = 1): Promise<void> {
    try {
      this[filter].set(
        await this.api.get<Page<Occupancy>>('flats/' + this.id + '/occupancies', {
          filter,
          page,
          pageSize: 20,
        }),
      );
    } catch (e) {
      this[filter].set(null);
      this.error.set(propertyError(e));
    }
  }
  protected open(): void {
    this.personId = '';
    this.startsOn = '';
    this.endsOn = '';
    this.formError.set(null);
    this.showForm.set(true);
  }
  protected async save(valid: boolean | null): Promise<void> {
    if (!valid || this.busy()) return;
    if (!this.personId) {
      this.formError.set('Choose an existing resident.');
      return;
    }
    if (this.endsOn && this.endsOn < this.startsOn) {
      this.formError.set('End date must not precede start date.');
      return;
    }
    this.busy.set(true);
    this.formError.set(null);
    try {
      await this.api.post('flats/' + this.id + '/occupancies', {
        personId: this.personId,
        occupancyType: this.occupancyType,
        startsOn: this.startsOn,
        endsOn: this.endsOn || null,
      });
      this.showForm.set(false);
      await this.load();
    } catch (e) {
      this.formError.set(propertyError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected askClose(row: Occupancy): void {
    this.closeDate = '';
    this.formError.set(null);
    this.closing.set(row);
  }
  protected async close(): Promise<void> {
    const row = this.closing();
    if (!row || !this.closeDate || this.busy()) return;
    if (this.closeDate < row.startsOn) {
      this.formError.set('End date must not precede start date.');
      return;
    }
    this.busy.set(true);
    this.formError.set(null);
    try {
      await this.api.post('flats/' + this.id + '/occupancies/' + row.id + '/close', {
        version: row.version,
        endsOn: this.closeDate,
      });
      this.closing.set(null);
      await this.load();
    } catch (e) {
      this.formError.set(propertyError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
