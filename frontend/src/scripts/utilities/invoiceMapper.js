// ./frontend/src/scripts/utilities/invoiceMapper.js

export const mapInvoicePayload = ({
  values,
  items,
  transportItems,
  deductions,
  totals,
  invoiceType,
  includeGST,
}) => ({
  scrNumber: Number(values.scrNumber),
  date: values.date.format('YYYY-MM-DD'),
  invoiceType,
  includeGST,
  grossTotal: totals.grossTotal,
  gstAmount: totals.gstAmount,
  finalTotal: totals.finalTotal,
  items,
  transportItems,
  ...deductions,
});