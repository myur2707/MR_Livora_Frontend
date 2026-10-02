import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';
import type { Page } from './onboarding';
export type DirectoryKind = 'buildings' | 'flats' | 'persons';
export interface Resource {
  id: string;
  version: string;
  createdAt: string;
  archivedAt: string | null;
}
export interface Building extends Resource {
  code: string;
  name: string;
}
export interface ManagedFlat extends Resource {
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  flatNumber: string;
  areaSqFt: string | null;
}
export interface Person extends Resource {
  displayName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  reference: string | null;
}
export type DirectoryRow = Building | ManagedFlat | Person;
export const occupancyTypes = ['OWNER', 'TENANT', 'FAMILY_MEMBER', 'AUTHORIZED_OCCUPANT'] as const;
export interface Occupancy {
  id: string;
  version: string;
  personId: string;
  displayName: string;
  occupancyType: string;
  startsOn: string;
  endsOn: string | null;
}
export interface ImportBatch {
  id: string;
  importType: 'FLATS' | 'RESIDENTS';
  status: string;
  sourceHash: string;
  reviewHash: string;
  totalRows: number;
  errorRows: number;
  warningRows: number;
  expiresAt: string;
  createdAt: string;
  result: { buildings: number; flats: number; persons: number; occupancies: number } | null;
}
export interface ImportRow {
  rowNumber: number;
  lineNumber: number;
  values: Record<string, string>;
  errors: { field: string; code: string; message: string }[];
  warnings: { field: string; code: string; message: string }[];
}
export const csvTemplates = {
  FLATS: 'building_code,building_name,flat_number,area_sq_ft\n',
  RESIDENTS:
    'person_reference,display_name,contact_email,contact_phone,building_code,flat_number,occupancy_type,starts_on,ends_on\n',
};
export function propertyError(error: unknown): string {
  const payload: unknown = error instanceof HttpErrorResponse ? error.error : null;
  const nested =
    typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
  const code =
    typeof nested === 'object' && nested !== null && 'code' in nested ? nested.code : null;
  switch (code) {
    case 'REVISION_CONFLICT':
    case 'CONTEXT_CHANGED':
      return 'This record or society context changed. Refresh before trying again.';
    case 'CONFLICT':
      return 'This code, flat number or resident reference already exists. Archived identifiers remain reserved.';
    case 'OCCUPANCY_OVERLAP':
      return 'This person already has an overlapping occupancy of the same type in this flat.';
    case 'HISTORY_IMMUTABLE':
      return 'Closed occupancy history is read-only.';
    case 'ARCHIVE_DEPENDENCIES':
      return 'End ongoing occupancies or archive child flats before archiving this record.';
    case 'REFERENCE_IMMUTABLE':
      return 'Assigned resident references cannot be changed.';
    case 'RESOURCE_ARCHIVED':
      return 'Archived records are read-only.';
    case 'INVALID_CSV':
      return 'Check CSV headers, quoting, UTF-8 encoding and limits: 256 KiB, 500 rows.';
    case 'REVALIDATE_REQUIRED':
      return 'Society data changed since preview. Revalidate and review the rows again.';
    case 'IMPORT_UNAVAILABLE':
      return 'This import is confirmed, cancelled or expired. Upload a new file.';
    case 'IMPORT_ROW_CONFLICT':
      return 'A reviewed CSV row conflicts with current data. Revalidate; the entire import was rolled back.';
    case 'IMPORT_ERRORS':
      return 'Correct every row error before confirming the import.';
    case 'IMPORT_WARNINGS':
      return 'Review and acknowledge duplicate warnings before confirmation.';
    case 'INVALID_REQUEST':
      return 'Check required fields, formats and dates. End date must follow start date.';
    case 'NOT_FOUND':
    case 'ACCESS_DENIED':
      return 'This record is unavailable in your selected society.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please try again later.';
    default:
      return 'Unable to complete your request. Please try again.';
  }
}
@Injectable({ providedIn: 'root' })
export class PropertyApi {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  get<T>(path: string, query: Record<string, string | number> = {}): Promise<T> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) params = params.set(key, value);
    return firstValueFrom(this.http.get<T>('/api/v1/society/' + path, { params }));
  }
  list<T>(kind: DirectoryKind, query: Record<string, string | number> = {}): Promise<Page<T>> {
    return this.get<Page<T>>(kind, query);
  }
  async post<T = void>(path: string, body: unknown): Promise<T> {
    await this.auth.prepare();
    return firstValueFrom(this.http.post<T>('/api/v1/society/' + path, body));
  }
  async put(path: string, body: unknown): Promise<void> {
    await this.auth.prepare();
    await firstValueFrom(this.http.put<void>('/api/v1/society/' + path, body));
  }
}
