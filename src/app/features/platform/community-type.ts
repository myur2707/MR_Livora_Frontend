/** Community types and their code prefixes; the server assigns SOC-00001, FLT-00001, TWP-00001… */
export const COMMUNITY_TYPES = [
  { value: 'SOC', label: 'Society' },
  { value: 'FLT', label: 'Flat' },
  { value: 'TWP', label: 'Township' },
] as const;
export type CommunityType = (typeof COMMUNITY_TYPES)[number]['value'];

export interface CommunityFieldText {
  codeLabel: string;
  codeHint: string;
  codeError: string;
  nameLabel: string;
  nameError: string;
}

/** Form wording for the selected type: "Society code", "Enter the Township name.", … */
export function communityFieldText(type: CommunityType): CommunityFieldText {
  const label = COMMUNITY_TYPES.find((option) => option.value === type)?.label ?? 'Society';
  return {
    codeLabel: label + ' code',
    codeHint: `Filled in automatically as ${type}-00001, ${type}-00002 and so on. You can change it.`,
    codeError: `Enter a valid, unique ${label} code.`,
    nameLabel: label + ' name',
    nameError: `Enter the ${label} name.`,
  };
}

/** Type named by a code's prefix (SOC-00001 → Society); older free-form codes carry none. */
export function communityTypeFromCode(code: string): string | null {
  return COMMUNITY_TYPES.find((option) => code.startsWith(option.value + '-'))?.label ?? null;
}
