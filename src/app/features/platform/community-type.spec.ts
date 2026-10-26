import { describe, expect, it } from 'vitest';
import { COMMUNITY_TYPES, communityFieldText, communityTypeFromCode } from './community-type';

describe('communityFieldText', () => {
  it('names the code and name fields after the selected type', () => {
    expect(communityFieldText('SOC')).toEqual({
      codeLabel: 'Society code',
      codeHint: 'Filled in automatically as SOC-00001, SOC-00002 and so on. You can change it.',
      codeError: 'Enter a valid, unique Society code.',
      nameLabel: 'Society name',
      nameError: 'Enter the Society name.',
    });
    expect(communityFieldText('FLT').codeLabel).toBe('Flat code');
    expect(communityFieldText('FLT').nameError).toBe('Enter the Flat name.');
    expect(communityFieldText('TWP').nameLabel).toBe('Township name');
    expect(communityFieldText('TWP').codeHint).toContain('TWP-00001');
  });
  it('offers exactly Society, Flat and Township in that order', () => {
    expect(COMMUNITY_TYPES.map((option) => option.label)).toEqual(['Society', 'Flat', 'Township']);
  });
});

describe('communityTypeFromCode', () => {
  it('reads the type from the code prefix and leaves older codes untyped', () => {
    expect(communityTypeFromCode('SOC-00001')).toBe('Society');
    expect(communityTypeFromCode('FLT-00012')).toBe('Flat');
    expect(communityTypeFromCode('TWP-00003')).toBe('Township');
    expect(communityTypeFromCode('VARADA')).toBeNull();
    expect(communityTypeFromCode('SOC3')).toBeNull();
  });
});
