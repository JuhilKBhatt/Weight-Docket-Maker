// ./frontend/src/tests/AUDformatters.test.js

import { describe, it, expect } from 'vitest';
import { audFormatterFixed } from '../scripts/utilities/AUDFormatters.js';

describe('audFormatterFixed', () => {
    it('formats thousands correctly', () => {
        const result = audFormatterFixed(1234.56);
        expect(result).toBe('1,234.56');
    });

    it('formats ten thousands correctly', () => {
        const result = audFormatterFixed(12345.67);
        expect(result).toBe('12,345.67');
    });

    it('formats millions correctly', () => {
        const result = audFormatterFixed(1234567.89);
        expect(result).toBe('1,234,567.89');
    });

    it('handles negative numbers', () => {
        const result = audFormatterFixed(-9876.54);
        expect(result).toBe('-9,876.54');
    });

    it('handles numbers with more than two decimal places', () => {
        const result = audFormatterFixed(1234.5678);
        expect(result).toBe('1,234.57');
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