import { describe, it, expect } from 'vitest';
import { audFormatterFixed } from './scripts/utilities/AUDFormatters.js';

describe('audFormatterFixed', () => {
  it('formats thousands correctly', () => {
    const result = audFormatterFixed(1234.56);
    expect(result).toBe('1,234.56');
  });

  it('adds decimal places to integers', () => {
    const result = audFormatterFixed(100);
    expect(result).toBe('100.00');
  });

  it('handles zero', () => {
    const result = audFormatterFixed(0);
    expect(result).toBe('0.00');
  });
});