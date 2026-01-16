// src/scripts/DocketCalculationHandler.js

export default class DocketCalculationHandler {
  constructor({
    items = [],
    preGstDeductions = [],
    postGstDeductions = [],
    includeGST = false,
    gstPercentage = 10,
  }) {
    this.items = items;
    this.preGstDeductions = preGstDeductions;
    this.postGstDeductions = postGstDeductions;
    this.includeGST = includeGST;
    this.gstPercentage = Number(gstPercentage) || 0;
  }

  safeNumber(value) {
    const num = parseFloat(value);
    return Number.isNaN(num) ? 0 : num;
  }

  round(value) {
    return Math.round(this.safeNumber(value) * 100) / 100;
  }

  // ---------- ROW CALCULATIONS ----------
  calculateItemTotals() {
    return this.items.map(item => {
      // Docket Specific: Net = Gross - Tare
      const gross = this.safeNumber(item.gross);
      const tare = this.safeNumber(item.tare);
      const price = this.safeNumber(item.price);

      const net = this.round(gross - tare);
      
      // Calculate Total
      const total = this.round(net * price);

      return {
        ...item,
        net,
        total,
      };
    });
  }

  // ---------- DEDUCTIONS ----------
  calculateDeductionsTotal(deductions) {
    return deductions.reduce((sum, d) => {
      return sum + this.safeNumber(d.amount);
    }, 0);
  }

  // ---------- MAIN ----------
  getCalculations() {
    const itemsWithTotals = this.calculateItemTotals();
    
    // Sum of all line item totals
    const itemsTotal = itemsWithTotals.reduce(
      (sum, item) => sum + this.safeNumber(item.total),
      0
    );

    const preGstDeductionTotal = this.calculateDeductionsTotal(this.preGstDeductions);

    // Gross (Items - Pre-Deductions)
    const grossTotal = this.round(itemsTotal - preGstDeductionTotal);
    
    const gstRate = this.gstPercentage / 100;
    
    // Calculate GST even if gross is negative (standard behavior for credit notes, etc.)
    // If you prefer GST to be 0 on negative totals, check if (grossTotal > 0)
    const gstAmount = this.includeGST ? this.round(grossTotal * gstRate) : 0;
    
    // Post-GST Deductions
    const postGstDeductionTotal = this.calculateDeductionsTotal(this.postGstDeductions);
    
    // Final Total
    const finalTotal = this.round(grossTotal + gstAmount - postGstDeductionTotal);

    return {
      itemsWithTotals,
      itemsTotal: this.round(itemsTotal),
      preGstDeductionTotal: this.round(preGstDeductionTotal),
      postGstDeductionTotal: this.round(postGstDeductionTotal),
      grossTotal,
      gstAmount,
      finalTotal,
    };
  }
}