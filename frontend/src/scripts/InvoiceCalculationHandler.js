// src/scripts/InvoiceCalculationHandler.js

export default class InvoiceCalculationHandler {
  constructor({
    items = [],
    transportItems = [],
    preGstDeductions = [],
    postGstDeductions = [],
    includeGST = true,
    gstPercentage = 10,
  }) {
    this.items = items;
    this.transportItems = transportItems;
    this.preGstDeductions = preGstDeductions;
    this.postGstDeductions = postGstDeductions;
    this.includeGST = includeGST;
    this.gstPercentage = Number(gstPercentage) || 0;
  }

  safeNumber(value) {
    // Optimization: fast return if already a number
    if (typeof value === 'number') return value;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : 0;
  }

  round(value) {
    return Math.round(this.safeNumber(value) * 100) / 100;
  }

  // ---------- ITEMS ----------
  calculateItemTotals() {
    return this.items.map(item => {
      const qty = this.safeNumber(item.quantity);
      const price = this.safeNumber(item.price);
      
      const total = this.round(qty * price);

      // Optimization: If total hasn't changed, return the original object
      // This helps React.memo avoid re-renders
      if (item.total === total) {
          return item;
      }

      return {
        ...item,
        total,
      };
    });
  }

  // ---------- TRANSPORT ----------
  calculateTransportTotal() {
    return this.transportItems.reduce((sum, t) => {
      const count = this.safeNumber(t.numOfCtr);
      const price = this.safeNumber(t.pricePerCtr);
      return sum + (count * price);
    }, 0);
  }

  // ---------- DEDUCTIONS ----------
  calculateDeductionsTotal(deductions) {
    return deductions.reduce((sum, d) => {
      return sum + this.safeNumber(d.amount);
    }, 0);
  }

  // ---------- MAIN ----------
  getCalculations() {
    // 1. Calculate Rows (or re-use if passed in constructor)
    // Note: In the optimized hook, we pass items that already have .total,
    // but calculating simple multiplication again is negligible cost compared to React render cycles.
    const itemsWithTotals = this.calculateItemTotals();
    
    // 2. Sum Items
    const itemsTotal = itemsWithTotals.reduce(
      (sum, item) => sum + this.safeNumber(item.total),
      0
    );

    const transportTotal = this.calculateTransportTotal();
    const preGstDeductionTotal = this.calculateDeductionsTotal(this.preGstDeductions);

    // 3. Calculate Gross
    const grossTotal = this.round(itemsTotal + transportTotal - preGstDeductionTotal);
    
    // 4. Calculate GST
    const gstRate = this.gstPercentage / 100;
    const gstAmount = this.includeGST ? this.round(grossTotal * gstRate) : 0;
    
    // 5. Calculate Final
    const postGstDeductionTotal = this.includeGST ? this.calculateDeductionsTotal(this.postGstDeductions) : 0;
    const finalTotal = this.round(grossTotal + gstAmount - postGstDeductionTotal);

    return {
      itemsWithTotals,
      itemsTotal: this.round(itemsTotal),
      transportTotal: this.round(transportTotal),
      preGstDeductionTotal: this.round(preGstDeductionTotal),
      postGstDeductionTotal: this.round(postGstDeductionTotal),
      grossTotal,
      gstAmount,
      finalTotal,
    };
  }
}