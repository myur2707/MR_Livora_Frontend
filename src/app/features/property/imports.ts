import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PropertyApi, propertyError, csvTemplates } from '../../core/property';
import type { ImportBatch, ImportRow } from '../../core/property';
import type { Page } from '../../core/onboarding';
import { ButtonDirective } from '../../shared/button';
import { CardComponent } from '../../shared/card';
import { FieldComponent, ControlDirective, FormNoticeComponent } from '../../shared/field';
import { TableDirective } from '../../shared/table';
import { DialogComponent } from '../../shared/dialog';
import { PaginationComponent } from '../../shared/pagination';
@Component({
  selector: 'se-property-imports',
  imports: [
    FormsModule,
    ButtonDirective,
    CardComponent,
    FieldComponent,
    ControlDirective,
    FormNoticeComponent,
    TableDirective,
    DialogComponent,
    PaginationComponent,
  ],
  templateUrl: './imports.html',
})
export class PropertyImports implements OnInit {
  private readonly api = inject(PropertyApi);
  protected readonly batch = signal<ImportBatch | null>(null);
  protected readonly rows = signal<Page<ImportRow> | null>(null);
  protected readonly batches = signal<Page<ImportBatch> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly readingFile = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly rowKeys = Object.keys;
  protected importType: 'FLATS' | 'RESIDENTS' = 'FLATS';
  protected csv = '';
  protected fileName = 'edited.csv';
  protected acknowledged = false;
  private reviewedSource = '';
  protected needsPreview(): boolean {
    return this.csv !== '' && this.csv !== this.reviewedSource;
  }
  ngOnInit(): void {
    void this.load();
  }
  protected template(): string {
    return csvTemplates[this.importType];
  }
  protected downloadTemplate(): void {
    const url = URL.createObjectURL(
      new Blob([this.template()], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.importType.toLowerCase() + '-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }
  protected async chooseFile(event: Event): Promise<void> {
    if (!(event.target instanceof HTMLInputElement)) return;
    const file = event.target.files?.[0];
    if (!file) return;
    this.error.set(null);
    if (!/\.csv$/i.test(file.name) || file.size > 262144) {
      this.error.set('Choose a UTF-8 CSV file up to 256 KiB.');
      event.target.value = '';
      return;
    }
    this.readingFile.set(true);
    try {
      this.csv = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      this.fileName = file.name;
      this.importType = this.batch()?.importType ?? this.importType;
    } catch {
      this.csv = '';
      this.error.set('The file is not valid UTF-8. Save it as UTF-8 CSV and retry.');
    }
    this.readingFile.set(false);
    event.target.value = '';
  }
  protected async preview(): Promise<void> {
    if (this.busy() || this.readingFile() || !this.csv) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const previous = this.batch();
      const batch = await this.api.post<ImportBatch>('imports/preview', {
        importType: this.importType,
        fileName: this.fileName,
        csv: this.csv,
        ...(previous?.status === 'REVIEW' ? { replaceBatchId: previous.id } : {}),
      });
      this.reviewedSource = this.csv;
      this.batch.set(batch);
      this.acknowledged = false;
      await this.loadRows();
      await this.load();
    } catch (e) {
      this.error.set(propertyError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected async load(page = 1): Promise<void> {
    try {
      this.batches.set(await this.api.get<Page<ImportBatch>>('imports', { page, pageSize: 20 }));
    } catch (e) {
      this.batches.set(null);
      this.error.set(propertyError(e));
    }
  }
  protected async loadRows(page = 1): Promise<void> {
    const batch = this.batch();
    if (!batch || batch.status !== 'REVIEW') {
      this.rows.set(null);
      return;
    }
    try {
      this.rows.set(
        await this.api.get<Page<ImportRow>>('imports/' + batch.id + '/rows', {
          page,
          pageSize: 20,
        }),
      );
    } catch (e) {
      this.rows.set(null);
      this.error.set(propertyError(e));
    }
  }
  protected async open(batch: ImportBatch): Promise<void> {
    if (this.busy()) return;
    this.csv = '';
    this.reviewedSource = '';
    this.error.set(null);
    this.acknowledged = false;
    this.batch.set(batch);
    this.importType = batch.importType;
    await this.loadRows();
  }
  protected async revalidate(): Promise<void> {
    const batch = this.batch();
    if (!batch || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.batch.set(await this.api.post<ImportBatch>('imports/' + batch.id + '/revalidate', {}));
      this.acknowledged = false;
      await this.loadRows();
      await this.load();
    } catch (e) {
      this.error.set(propertyError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected async cancel(): Promise<void> {
    const batch = this.batch();
    if (!batch || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.post('imports/' + batch.id + '/cancel', {});
      this.batch.set(null);
      this.rows.set(null);
      this.csv = '';
      await this.load();
    } catch (e) {
      this.error.set(propertyError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected async confirm(): Promise<void> {
    const batch = this.batch();
    if (!batch || this.busy() || this.needsPreview()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.batch.set(
        await this.api.post<ImportBatch>('imports/' + batch.id + '/confirm', {
          sourceHash: batch.sourceHash,
          reviewHash: batch.reviewHash,
          confirmed: true,
          acknowledgeWarnings: this.acknowledged,
        }),
      );
      this.confirmOpen.set(false);
      this.csv = '';
      this.rows.set(null);
      await this.load();
    } catch (e) {
      this.confirmOpen.set(false);
      this.error.set(propertyError(e));
    } finally {
      this.busy.set(false);
    }
  }
  protected clear(): void {
    this.batch.set(null);
    this.rows.set(null);
    this.csv = '';
    this.acknowledged = false;
    this.error.set(null);
  }
}
