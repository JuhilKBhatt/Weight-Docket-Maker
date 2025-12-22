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

  // ---------- HELPERS ----------
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
      const weight = this.safeNumber(item.weight);
      const price = this.safeNumber(item.price);
      const total = this.round(weight * price);

      return {
        ...item,
        total,
      };
    });
  }

  // ---------- TRANSPORT ----------
  calculateTransportTotal() {
    return this.transportItems.reduce((sum, t) => {
      const count = this.safeNumber(t.NumOfCTR);
      const price = this.safeNumber(t.PricePreCTR);
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
    // Items
    const itemsWithTotals = this.calculateItemTotals();
    const itemsTotal = itemsWithTotals.reduce(
      (sum, item) => sum + this.safeNumber(item.total),
      0
    );

    // Transport
    const transportTotal = this.calculateTransportTotal();

    // Pre-GST deductions
    const preGstDeductionTotal =
      this.calculateDeductionsTotal(this.preGstDeductions);

    // Gross total (before GST)
    const grossTotal = this.round(
      itemsTotal + transportTotal - preGstDeductionTotal
    );

    // GST
    const gstAmount = this.includeGST
      ? this.round(grossTotal * 0.1)
      : 0;

    // Post-GST deductions
    const postGstDeductionTotal = this.includeGST
      ? this.calculateDeductionsTotal(this.postGstDeductions)
      : 0;

    // Final total
    const finalTotal = this.round(
      grossTotal + gstAmount - postGstDeductionTotal
    );

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