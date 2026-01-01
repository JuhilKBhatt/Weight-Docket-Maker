import { describe, it, expect } from 'vitest';
import InvoiceCalculationHandler from '../scripts/InvoiceCalculationHandler';

describe('InvoiceCalculationHandler', () => {

  describe('Basic Calculations', () => {
    it('calculates item totals correctly', () => {
      const handler = new InvoiceCalculationHandler({
        items: [
          { quantity: 2, price: 50 }, // 100
          { quantity: 1.5, price: 20 } // 30
        ]
      });
      const results = handler.getCalculations();
      
      expect(results.itemsTotal).toBe(130);
      expect(results.itemsWithTotals[0].total).toBe(100);
      expect(results.itemsWithTotals[1].total).toBe(30);
    });

    it('calculates transport totals correctly', () => {
      const handler = new InvoiceCalculationHandler({
        transportItems: [
          { numOfCtr: 2, pricePerCtr: 100 }, // 200
          { numOfCtr: 1, pricePerCtr: 50 }   // 50
        ]
      });
      const results = handler.getCalculations();
      expect(results.transportTotal).toBe(250);
    });
  });

  describe('GST Handling', () => {
    it('calculates GST correctly when includeGST is true', () => {
      const handler = new InvoiceCalculationHandler({
        items: [{ quantity: 1, price: 100 }], // 100
        includeGST: true
      });
      const results = handler.getCalculations();

      expect(results.grossTotal).toBe(100);
      expect(results.gstAmount).toBe(10); // 10% of 100
      expect(results.finalTotal).toBe(110);
    });

    it('does NOT calculate GST when includeGST is false', () => {
      const handler = new InvoiceCalculationHandler({
        items: [{ quantity: 1, price: 100 }],
        includeGST: false
      });
      const results = handler.getCalculations();

      expect(results.grossTotal).toBe(100);
      expect(results.gstAmount).toBe(0);
      expect(results.finalTotal).toBe(100);
    });
  });

  describe('Deductions', () => {
    it('subtracts Pre-GST deductions before calculating GST', () => {
      // Items: 100 + 100 = 200
      // Pre-Deduction: 50
      // Gross Expected: 150
      // GST Expected: 15 (10% of 150)
      // Final: 165
      const handler = new InvoiceCalculationHandler({
        items: [{ quantity: 2, price: 100 }],
        preGstDeductions: [{ amount: 50 }],
        includeGST: true
      });
      const results = handler.getCalculations();

      expect(results.itemsTotal).toBe(200);
      expect(results.preGstDeductionTotal).toBe(50);
      expect(results.grossTotal).toBe(150);
      expect(results.gstAmount).toBe(15);
      expect(results.finalTotal).toBe(165);
    });

    it('subtracts Post-GST deductions after GST is added', () => {
      // Items: 100
      // GST: 10
      // Subtotal (Gross + GST): 110
      // Post-Deduction: 20
      // Final: 90
      const handler = new InvoiceCalculationHandler({
        items: [{ quantity: 1, price: 100 }],
        postGstDeductions: [{ amount: 20 }],
        includeGST: true
      });
      const results = handler.getCalculations();

      expect(results.grossTotal).toBe(100);
      expect(results.gstAmount).toBe(10);
      expect(results.postGstDeductionTotal).toBe(20);
      expect(results.finalTotal).toBe(90);
    });

    it('ignores Post-GST deductions if GST is disabled (based on your logic)', () => {
      // Your code logic: const postGstDeductionTotal = this.includeGST ? ... : 0;
      const handler = new InvoiceCalculationHandler({
        items: [{ quantity: 1, price: 100 }],
        postGstDeductions: [{ amount: 50 }],
        includeGST: false
      });
      const results = handler.getCalculations();

      expect(results.postGstDeductionTotal).toBe(0);
      expect(results.finalTotal).toBe(100);
    });
  });

  describe('Edge Cases & Data Safety', () => {
    it('handles empty inputs gracefully', () => {
      const handler = new InvoiceCalculationHandler({});
      const results = handler.getCalculations();

      expect(results.finalTotal).toBe(0);
      expect(results.itemsWithTotals).toEqual([]);
    });

    it('handles strings instead of numbers', () => {
      const handler = new InvoiceCalculationHandler({
        items: [{ quantity: "2", price: "50" }] // Strings
      });
      const results = handler.getCalculations();

      expect(results.itemsTotal).toBe(100);
    });

    it('handles invalid inputs (NaN) safely', () => {
      const handler = new InvoiceCalculationHandler({
        items: [{ quantity: "abc", price: 50 }] // Invalid quantity
      });
      const results = handler.getCalculations();

      expect(results.itemsTotal).toBe(0); // 0 * 50
    });

    it('rounds floating point numbers correctly', () => {
      // Your round function: Math.round(value * 100) / 100
      
      const handler = new InvoiceCalculationHandler({
        items: [{ quantity: 1, price: 33.3333 }] 
      });
      const results = handler.getCalculations();

      // 33.3333 -> 33.33
      expect(results.itemsTotal).toBe(33.33);
    });
  });
});