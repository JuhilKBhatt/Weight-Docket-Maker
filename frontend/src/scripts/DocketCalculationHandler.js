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

  // Currency rounding (2 decimals)
  round(value) {
    return Math.round(this.safeNumber(value) * 100) / 100;
  }

  roundWeight(value) {
    return Math.round(this.safeNumber(value) * 1000) / 1000;
  }

  // ---------- ROW CALCULATIONS ----------
  calculateItemTotals() {
    return this.items.map(item => {
      const gross = this.safeNumber(item.gross);
      const tare = this.safeNumber(item.tare);
      const price = this.safeNumber(item.price);

      const net = this.roundWeight(gross - tare);
      
      // Calculate Total (Currency, 2 decimals)
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
    
    const itemsTotal = itemsWithTotals.reduce(
      (sum, item) => sum + this.safeNumber(item.total),
      0
    );

    const preGstDeductionTotal = this.calculateDeductionsTotal(this.preGstDeductions);

    // Gross (Items - Pre-Deductions)
    const grossTotal = this.round(itemsTotal - preGstDeductionTotal);
    
    const gstRate = this.gstPercentage / 100;
    
    const gstAmount = this.includeGST ? this.round(grossTotal * gstRate) : 0;
    
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