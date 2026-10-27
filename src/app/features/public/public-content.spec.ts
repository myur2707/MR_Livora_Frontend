import { describe, expect, it } from 'vitest';
import { WHATSAPP_ENQUIRY, whatsappLink } from './public-content';

describe('whatsappLink', () => {
  it('opens a chat with the founder number and the encoded enquiry', () => {
    const url = new URL(whatsappLink());
    expect(url.origin + url.pathname).toBe('https://wa.me/919157379787');
    expect(url.searchParams.get('text')).toBe(WHATSAPP_ENQUIRY);
  });
  it('asks for the details the team needs first, in a professional tone', () => {
    expect(WHATSAPP_ENQUIRY.startsWith('Hello Mr. Livora team,')).toBe(true);
    for (const field of [
      'Name:',
      'Society/Flat/Township name:',
      'City:',
      'Number of flats or units:',
    ])
      expect(WHATSAPP_ENQUIRY).toContain(field);
    expect(WHATSAPP_ENQUIRY).not.toContain('Interested in');
  });
});
