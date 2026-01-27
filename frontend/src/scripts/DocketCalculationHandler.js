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
    // Faster check than parseFloat for common cases
    if (typeof value === 'number') return value;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : 0;
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
      // Optimization: If net/total are already calculated and inputs haven't changed, skip
      // (This requires the caller to manage state immutability carefully)
      
      const gross = this.safeNumber(item.gross);
      const tare = this.safeNumber(item.tare);
      const price = this.safeNumber(item.price);

      const net = this.roundWeight(gross - tare);
      const total = this.round(net * price);

      // Only return new object if values actually changed to help React.memo
      if (item.net === net && item.total === total) {
          return item;
      }

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
    // 1. Calculate Rows
    const itemsWithTotals = this.calculateItemTotals();
    
    // 2. Sum Items (Fast loop)
    let itemsTotal = 0;
    for (const item of itemsWithTotals) {
        itemsTotal += (item.total || 0);
    }
    itemsTotal = this.round(itemsTotal);

    // 3. Deductions
    const preGstDeductionTotal = this.calculateDeductionsTotal(this.preGstDeductions);

    // 4. Gross
    const grossTotal = this.round(itemsTotal - preGstDeductionTotal);
    
    // 5. GST
    const gstRate = this.gstPercentage / 100;
    const gstAmount = this.includeGST ? this.round(grossTotal * gstRate) : 0;
    
    // 6. Post Deductions
    const postGstDeductionTotal = this.calculateDeductionsTotal(this.postGstDeductions);
    
    // 7. Final
    const finalTotal = this.round(grossTotal + gstAmount - postGstDeductionTotal);

    return {
      itemsWithTotals,
      itemsTotal,
      preGstDeductionTotal,
      postGstDeductionTotal,
      grossTotal,
      gstAmount,
      finalTotal,
    };
  }
}