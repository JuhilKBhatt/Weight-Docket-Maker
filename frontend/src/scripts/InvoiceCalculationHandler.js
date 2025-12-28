// ./frontend/src/scripts/InvoiceCalculationHandler.js

export default class InvoiceCalculationHandler {
  constructor({
    items = [],
    transportItems = [],
    preGstDeductions = [],
    postGstDeductions = [],
    includeGST = true,
  }) {
    this.items = items;
    this.transportItems = transportItems;
    this.preGstDeductions = preGstDeductions;
    this.postGstDeductions = postGstDeductions;
    this.includeGST = includeGST;
  }

  safeNumber(value) {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  }

  round(value) {
    return Math.round(this.safeNumber(value) * 100) / 100;
  }

  // ---------- ITEMS ----------
  calculateItemTotals() {
    return this.items.map(item => {
      // CHANGED: weight -> quantity
      const qty = this.safeNumber(item.quantity);
      const price = this.safeNumber(item.price);
      const total = this.round(qty * price);

      return {
        ...item,
        total,
      };
    });
  }

  // ---------- TRANSPORT ----------
  calculateTransportTotal() {
    return this.transportItems.reduce((sum, t) => {
      // CHANGED: NumOfCTR -> numOfCtr, PricePreCTR -> pricePerCtr
      const count = this.safeNumber(t.numOfCtr);
      const price = this.safeNumber(t.pricePerCtr);
      return sum + count * price;
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
    const itemsWithTotals = this.calculateItemTotals();
    const itemsTotal = itemsWithTotals.reduce(
      (sum, item) => sum + this.safeNumber(item.total),
      0
    );

    const transportTotal = this.calculateTransportTotal();
    const preGstDeductionTotal = this.calculateDeductionsTotal(this.preGstDeductions);
    const grossTotal = this.round(itemsTotal + transportTotal - preGstDeductionTotal);
    const gstAmount = this.includeGST ? this.round(grossTotal * 0.1) : 0;
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