// ./frontend/src/scripts/InvoiceCalculationHandler.js

/**
 * @class InvoiceCalculationHandler
 * @description A utility class to handle all financial calculations for an invoice.
 * It processes line items, transport costs, deductions, and GST to produce a final, comprehensive calculation object.
 * This keeps the calculation logic separate from the React component's rendering logic.
 */
class InvoiceCalculationHandler {
  /**
   * The standard Goods and Services Tax (GST) rate for Australia.
   * @type {number}
   * @static
   */
  static GST_RATE = 0.10;

  /**
   * Initializes the calculation handler with data from the invoice form.
   * It sanitizes numeric inputs to prevent calculation errors from empty or invalid fields.
   *
   * @param {object} invoiceData - The raw data from the invoice form state.
   * @param {Array<object>} invoiceData.items - Line items, each with 'weight' and 'price'.
   * @param {Array<object>} [invoiceData.transportItems=[]] - Transport charges, each with 'NumOfCTR' and 'PricePreCTR'.
   * @param {Array<object>} [invoiceData.preGstDeductions=[]] - Deductions applied before GST, each with an 'amount'.
   * @param {Array<object>} [invoiceData.postGstDeductions=[]] - Deductions applied after GST, each with an 'amount'.
   * @param {boolean} [invoiceData.includeGST=true] - A flag to determine if GST should be included in the total.
   */
  constructor({
    items,
    transportItems = [],
    preGstDeductions = [],
    postGstDeductions = [],
    includeGST = true
  }) {
    this.items = this._sanitize(items, ['weight', 'price']);
    this.transportItems = this._sanitize(transportItems, ['NumOfCTR', 'PricePreCTR']);
    this.preGstDeductions = this._sanitize(preGstDeductions, ['amount']);
    this.postGstDeductions = this._sanitize(postGstDeductions, ['amount']);
    this.includeGST = includeGST;
  }

  /**
   * A private helper method to ensure that specified properties within an array of objects are valid numbers.
   * It replaces non-numeric values (like null, undefined, or empty strings) with 0.
   * @private
   * @param {Array<object>} dataArray - The array of objects to process.
   * @param {Array<string>} numericKeys - The keys that should contain numeric values.
   * @returns {Array<object>} The sanitized array.
   */
  _sanitize(dataArray, numericKeys) {
    if (!Array.isArray(dataArray)) return [];
    return dataArray.map(item => {
      const sanitizedItem = { ...item };
      numericKeys.forEach(key => {
        sanitizedItem[key] = parseFloat(sanitizedItem[key]) || 0;
      });
      return sanitizedItem;
    });
  }

  /**
   * Sums the values of a specific property from an array of objects.
   * @private
   * @param {Array<object>} dataArray - The array to sum over.
   * @param {string} key - The property key whose values should be summed.
   * @returns {number} The total sum.
   */
  _sum(dataArray, key) {
    return dataArray.reduce((accumulator, item) => accumulator + (item[key] || 0), 0);
  }

  /**
   * Performs all invoice calculations in the correct order and returns the results.
   * This is the main public method to get the final calculated values.
   *
   * @returns {object} An object containing all calculated financial values for the invoice.
   */
  getCalculations() {
    // 1. Calculate the total for each individual line item and transport charge.
    const itemsWithTotals = this.items.map(item => ({
      ...item,
      total: item.weight * item.price,
    }));
    const transportWithTotals = this.transportItems.map(item => ({
        ...item,
        total: item.NumOfCTR * item.PricePreCTR,
    }));

    // 2. Calculate the gross total (sum of all items and transport) before any deductions.
    const itemsSubtotal = this._sum(itemsWithTotals, 'total');
    const transportSubtotal = this._sum(transportWithTotals, 'total');
    const grossTotal = itemsSubtotal + transportSubtotal;

    // 3. Calculate pre-GST deductions and the resulting taxable amount.
    const totalPreGstDeductions = this._sum(this.preGstDeductions, 'amount');
    const taxableAmount = grossTotal - totalPreGstDeductions;

    // 4. Calculate GST if applicable.
    const gstAmount = this.includeGST ? taxableAmount * InvoiceCalculationHandler.GST_RATE : 0;
    const totalWithGst = taxableAmount + gstAmount;

    // 5. Calculate post-GST deductions. These are only applied if GST is included.
    const totalPostGstDeductions = this.includeGST ? this._sum(this.postGstDeductions, 'amount') : 0;
    
    // 6. Calculate the final, payable total.
    const finalTotal = totalWithGst - totalPostGstDeductions;

    return {
      itemsWithTotals,          // Use this to update the 'Total' column for each item row.
      transportWithTotals,      // Use this to update transport charge totals if displayed.
      grossTotal,               // This is the "Sub-Total" displayed before GST.
      totalPreGstDeductions,
      taxableAmount,
      gstAmount,                // The value for the disabled "GST" field.
      totalPostGstDeductions,
      finalTotal,               // The value for the final "Total" field.
    };
  }
}

export default InvoiceCalculationHandler;