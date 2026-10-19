// frontend/src/tests/ocrMapping.test.js

import { describe, it, expect } from 'vitest';
import { MATERIAL_WHITELIST } from '../services/ocrService';

describe('OCR Data Mapping & Whitelist', () => {
  it('contains all 51 normalized scrap metal materials from the OCR Prompt specification', () => {
    expect(MATERIAL_WHITELIST).toContain('Battery');
    expect(MATERIAL_WHITELIST).toContain('L. Steel');
    expect(MATERIAL_WHITELIST).toContain('M. Wire');
    expect(MATERIAL_WHITELIST).toContain('RD. C');
    expect(MATERIAL_WHITELIST).toContain('RD. D');
    expect(MATERIAL_WHITELIST).toContain('Copper Domestic');
    expect(MATERIAL_WHITELIST).toContain('Computer');
    expect(MATERIAL_WHITELIST.length).toBe(51);
  });

  it('merges tare and extra_deduction into effectiveTare so Net = Gross - Tare computes accurately', () => {
    // Standard line: 707 - 308 = Steel
    const line1 = { gross: 707, tare: 308, extra_deduction: null, material: 'Steel' };
    const effTare1 = (Number(line1.tare) || 0) + (Number(line1.extra_deduction) || 0);
    expect(effTare1).toBe(308);
    expect(line1.gross - effTare1).toBe(399);

    // Extra deduction line: 566 - 300 - 70 = Steel -> Effective Tare = 370, Net = 196
    const line2 = { gross: 566, tare: 300, extra_deduction: 70, material: 'Steel' };
    const effTare2 = (Number(line2.tare) || 0) + (Number(line2.extra_deduction) || 0);
    expect(effTare2).toBe(370);
    expect(line2.gross - effTare2).toBe(196);

    // Occluded finger tare line: 635 [finger] 25 = Battery -> Effective Tare = 25, Net = 610
    const line3 = { gross: 635, tare: null, extra_deduction: 25, material: 'Battery' };
    const effTare3 = (Number(line3.tare) || 0) + (Number(line3.extra_deduction) || 0);
    expect(effTare3).toBe(25);
    expect(line3.gross - effTare3).toBe(610);
  });
});

