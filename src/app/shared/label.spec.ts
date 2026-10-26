import { describe, expect, it } from 'vitest';
import { eventLabel, friendlyLabel } from './label';
import { niceStep, chartTick } from './charts';

describe('friendlyLabel', () => {
  it('turns stored codes into sentence-case words and keeps acronyms', () => {
    expect(friendlyLabel('IN_PROGRESS')).toBe('In progress');
    expect(friendlyLabel('BANK_TRANSFER')).toBe('Bank transfer');
    expect(friendlyLabel('PER_SQ_FT')).toBe('Per sq ft');
    expect(friendlyLabel('OWNER')).toBe('Owner');
    expect(friendlyLabel('UPI')).toBe('UPI');
  });
  it('leaves free text, dates and numbered identifiers untouched', () => {
    expect(friendlyLabel('Kitchen tap leaking')).toBe('Kitchen tap leaking');
    expect(friendlyLabel('2026-10')).toBe('2026-10');
    expect(friendlyLabel('R-2026-0001')).toBe('R-2026-0001');
    expect(friendlyLabel(null)).toBe('');
  });
  it('in code mode only rewrites identifiers that contain underscores', () => {
    expect(friendlyLabel('ROW_HOUSES', 'code')).toBe('Row houses');
    expect(friendlyLabel('A', 'code')).toBe('A');
    expect(friendlyLabel('SOC3', 'code')).toBe('SOC3');
  });
});

describe('chart axis helpers', () => {
  it('rounds axis steps to clean numbers and keeps count steps whole', () => {
    expect(niceStep(1300, 'money')).toBe(2000);
    expect(niceStep(2.4, 'money')).toBe(2.5);
    expect(niceStep(0.3, 'count')).toBe(1);
    expect(niceStep(0, 'count')).toBe(1);
  });
  it('formats money ticks compactly in rupees', () => {
    expect(chartTick(0, 'money')).toBe('₹0');
    expect(chartTick(5000, 'money')).toBe('₹5K');
    expect(chartTick(3, 'count')).toBe('3');
  });
});

describe('eventLabel', () => {
  it('turns audit action keys into sentence-case titles', () => {
    expect(eventLabel('society.status_changed')).toBe('Society status changed');
    expect(eventLabel('society.created')).toBe('Society created');
    expect(eventLabel('INVITATION.SENT')).toBe('Invitation sent');
  });
});
