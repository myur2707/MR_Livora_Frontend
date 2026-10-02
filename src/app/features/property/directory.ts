import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PropertyApi, propertyError } from '../../core/property';
import type { DirectoryKind, DirectoryRow } from '../../core/property';
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
  selector: 'se-property-directory',
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
  templateUrl: './directory.html',
})
export class PropertyDirectory {
  private readonly api = inject(PropertyApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly kind = signal<DirectoryKind>('buildings');
  protected readonly result = signal<Page<DirectoryRow> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly showForm = signal(false);
  protected readonly archived = signal<DirectoryRow | null>(null);
  protected editing: DirectoryRow | null = null;
  protected q = '';
  protected state = 'active';
  protected sort = 'code';
  protected direction = 'asc';
  protected buildingFilter = '';
  protected code = '';
  protected name = '';
  protected buildingId = '';
  protected flatNumber = '';
  protected area = '';
  protected email = '';
  protected phone = '';
  protected reference = '';
  private sequence = 0;
  constructor() {
    this.route.data.pipe(takeUntilDestroyed()).subscribe((data) => {
      const kind: unknown = data['kind'];
      if (kind === 'buildings' || kind === 'flats' || kind === 'persons') {
        this.kind.set(kind);
        this.sort = kind === 'buildings' ? 'code' : kind === 'flats' ? 'flatNumber' : 'displayName';
        this.q = '';
        this.state = 'active';
        this.buildingFilter = '';
        this.showForm.set(false);
        this.archived.set(null);
        this.result.set(null);
        void this.load();
      }
    });
  }
  protected title(): string {
    return this.kind() === 'persons'
      ? 'Residents'
      : this.kind() === 'flats'
        ? 'Flats'
        : 'Buildings';
  }
  protected sorts(): string[] {
    return this.kind() === 'buildings'
      ? ['code', 'name', 'createdAt']
      : this.kind() === 'flats'
        ? ['flatNumber', 'buildingCode', 'areaSqFt', 'createdAt']
        : ['displayName', 'reference', 'createdAt'];
  }
  protected sortLabel(value: string): string {
    return (
      (
        {
          code: 'Building code',
          name: 'Name',
          createdAt: 'Created date',
          flatNumber: 'Flat number',
          buildingCode: 'Building code',
          areaSqFt: 'Area',
          displayName: 'Resident name',
          reference: 'Resident reference',
        } as Record<string, string>
      )[value] ?? value
    );
  }
  protected label(row: DirectoryRow): string {
    return 'displayName' in row
      ? row.displayName
      : 'code' in row
        ? row.name
        : row.buildingCode + ' / ' + row.flatNumber;
  }
  protected detail(row: DirectoryRow): string {
    return 'displayName' in row
      ? [row.reference ?? 'No reference', row.contactEmail, row.contactPhone]
          .filter(Boolean)
          .join(' · ')
      : 'code' in row
        ? row.code
        : row.areaSqFt
          ? row.areaSqFt + ' sq ft'
          : 'Area not set';
  }
  protected async load(page = 1): Promise<void> {
    const n = ++this.sequence;
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.api.list<DirectoryRow>(this.kind(), {
        page,
        pageSize: 20,
        q: this.q,
        state: this.state,
        sort: this.sort,
        direction: this.direction,
        ...(this.kind() === 'flats' && this.buildingFilter
          ? { buildingId: this.buildingFilter }
          : {}),
      });
      if (n === this.sequence) this.result.set(data);
    } catch (e) {
      if (n === this.sequence) {
        this.result.set(null);
        this.error.set(propertyError(e));
      }
    } finally {
      if (n === this.sequence) this.loading.set(false);
    }
  }
  protected open(row: DirectoryRow | null = null): void {
    this.editing = row;
    this.formError.set(null);
    this.code = row && 'code' in row ? row.code : '';
    this.name = row ? this.label(row) : '';
    this.buildingId = row && 'buildingId' in row ? row.buildingId : '';
    this.flatNumber = row && 'flatNumber' in row ? row.flatNumber : '';
    this.area = row && 'areaSqFt' in row ? (row.areaSqFt ?? '') : '';
    this.email = row && 'contactEmail' in row ? (row.contactEmail ?? '') : '';
    this.phone = row && 'contactPhone' in row ? (row.contactPhone ?? '') : '';
    this.reference = row && 'reference' in row ? (row.reference ?? '') : '';
    this.showForm.set(true);
  }
  protected referenceLocked(): boolean {
    return !!(this.editing && 'reference' in this.editing && this.editing.reference);
  }
  protected async save(valid: boolean | null): Promise<void> {
    if (!valid || this.busy()) return;
    if (this.kind() === 'flats' && !this.buildingId) {
      this.formError.set('Choose a building.');
      return;
    }
    this.busy.set(true);
    this.formError.set(null);
    const body =
      this.kind() === 'buildings'
        ? { code: this.code, name: this.name }
        : this.kind() === 'flats'
          ? {
              buildingId: this.buildingId,
              flatNumber: this.flatNumber,
              areaSqFt: this.area || null,
            }
          : {
              displayName: this.name,
              contactEmail: this.email || null,
              contactPhone: this.phone || null,
              reference: this.reference || null,
            };
    try {
      if (this.editing)
        await this.api.put(this.kind() + '/' + this.editing.id, {
          ...body,
          version: this.editing.version,
        });
      else await this.api.post(this.kind(), body);
      this.showForm.set(false);
      await this.load();
    } catch (e) {
      this.formError.set(propertyError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected async archive(): Promise<void> {
    const row = this.archived();
    if (!row || this.busy()) return;
    this.busy.set(true);
    this.formError.set(null);
    try {
      await this.api.post(this.kind() + '/' + row.id + '/archive', { version: row.version });
      this.archived.set(null);
      await this.load();
    } catch (e) {
      this.formError.set(propertyError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected askArchive(row: DirectoryRow): void {
    this.formError.set(null);
    this.archived.set(row);
  }
}
