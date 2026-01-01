import { describe, it, expect } from 'vitest';
import { 
  CURRENCY_OPTIONS, 
  UNIT_OPTIONS, 
  getCurrencyLabel 
} from '../scripts/utilities/invoiceConstants';

describe('invoiceConstants', () => {

  describe('CURRENCY_OPTIONS', () => {
    it('is an array', () => {
      expect(Array.isArray(CURRENCY_OPTIONS)).toBe(true);
    });

    it('contains specific currencies (AUD, USD, EUR)', () => {
      const codes = CURRENCY_OPTIONS.map(c => c.code);
      expect(codes).toContain('AUD');
      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
    });

    it('has the correct structure for each option', () => {
      CURRENCY_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('code');
        expect(option).toHaveProperty('symbol');
        expect(option).toHaveProperty('label');
      });
    });

    it('correctly maps symbols (e.g., EUR uses €)', () => {
      const eur = CURRENCY_OPTIONS.find(c => c.code === 'EUR');
      expect(eur.symbol).toBe('€');
      
      const gbp = CURRENCY_OPTIONS.find(c => c.code === 'GBP');
      expect(gbp.symbol).toBe('£');
    });
  });

  describe('UNIT_OPTIONS', () => {
    it('is an array', () => {
      expect(Array.isArray(UNIT_OPTIONS)).toBe(true);
    });

    it('contains common units (t, kg, pcs)', () => {
      const values = UNIT_OPTIONS.map(u => u.value);
      expect(values).toContain('t');
      expect(values).toContain('kg');
      expect(values).toContain('pcs');
    });

    it('has the correct structure for each option', () => {
      UNIT_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
      });
    });
  });

  describe('getCurrencyLabel', () => {
    it('returns the correct label for a known currency (AUD)', () => {
      const result = getCurrencyLabel('AUD');
      expect(result).toBe('AUD$');
    });

    it('returns the correct label for a known currency with unique symbol (EUR)', () => {
      const result = getCurrencyLabel('EUR');
      expect(result).toBe('EUR€');
    });

    it('returns a fallback format for an unknown currency', () => {
      const result = getCurrencyLabel('XYZ');
      // Logic in code: `${currencyCode}$`
      expect(result).toBe('XYZ$');
    });

    it('handles unexpected inputs gracefully (e.g. empty string)', () => {
      // The logic just returns `${currencyCode}$` if not found
      expect(getCurrencyLabel('')).toBe('$');
    });
  });

});