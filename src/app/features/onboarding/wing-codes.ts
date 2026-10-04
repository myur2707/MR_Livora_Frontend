export interface WingPlan {
  codes: string[];
  error: string | null;
}
export function parseWingCodes(selected: readonly string[], custom: string): WingPlan {
  const codes = [
    ...selected,
    ...custom
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter(Boolean),
  ];
  const invalid = (error: string): WingPlan => ({ codes: [], error });
  if (!codes.length) return invalid('Choose at least one wing or enter a custom code.');
  if (custom.length > 1000 || codes.length > 10) return invalid('Add at most 10 wings at a time.');
  if (codes.some((v) => v.length > 64 || /[\p{Cc}\uFFFD]/u.test(v)))
    return invalid('Wing codes must be 1-64 characters without control characters.');
  if (new Set(codes.map((v) => v.toLowerCase())).size !== codes.length)
    return invalid('Each wing code must be unique. Remove duplicate selections or custom codes.');
  return { codes, error: null };
}
