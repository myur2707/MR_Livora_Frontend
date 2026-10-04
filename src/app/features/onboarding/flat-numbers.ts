export interface FlatNumberPlan {
  numbers: string[];
  error: string | null;
}
export const propertyNumberLimits = {
  flats: { count: 100, characters: 4000 },
  rowHouses: { count: 200, characters: 8000 },
} as const;
function rangeNumbers(start: string, end: string, maximumNumbers: number): string[] | null {
  if (start.length > 32 || end.length > 32) return null;
  const first = BigInt(start);
  const last = BigInt(end);
  if (last < first || last - first + 1n > BigInt(maximumNumbers)) return null;
  const padded = start.startsWith('0') || end.startsWith('0');
  if (padded && start.length !== end.length) return null;
  const width = padded ? start.length : 0;
  const numbers: string[] = [];
  for (let current = first; current <= last; current++)
    numbers.push(current.toString().padStart(width, '0'));
  return numbers;
}
export function parseFlatNumbers(
  input: string,
  propertyType: keyof typeof propertyNumberLimits = 'flats',
): FlatNumberPlan {
  const limits = propertyNumberLimits[propertyType];
  const invalid = (error: string): FlatNumberPlan => ({ numbers: [], error });
  if (input.length > limits.characters)
    return invalid('Keep the flat-number list within ' + limits.characters + ' characters.');
  const entries = input
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!entries.length) return invalid('Enter flat numbers or a range, such as 101-110.');
  const numbers: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const range = /^(\d+)\s*[-\u2013\u2014]\s*(\d+)$/.exec(entry);
    const expanded = range ? rangeNumbers(range[1] ?? '', range[2] ?? '', limits.count) : [entry];
    if (!expanded)
      return invalid(
        'Use an ascending numeric range with at most ' +
          limits.count +
          ' flats and matching zero padding.',
      );
    for (const number of expanded) {
      if (number.length > 32 || /[\p{Cc}\uFFFD]/u.test(number))
        return invalid('Each flat number must be 1-32 characters without control characters.');
      const key = number.toLowerCase();
      if (seen.has(key))
        return invalid(
          'A flat number appears more than once. Remove overlapping ranges or duplicates.',
        );
      seen.add(key);
      numbers.push(number);
      if (numbers.length > limits.count)
        return invalid('Add at most ' + limits.count + ' flats per wing at a time.');
    }
  }
  return { numbers, error: null };
}
