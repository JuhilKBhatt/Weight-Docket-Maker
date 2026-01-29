// ./frontend/src/hooks/invoice/useInvoiceCalculations.js

import { useMemo } from 'react';
import InvoiceCalculationHandler from '../../scripts/InvoiceCalculationHandler';

export default function useInvoiceCalculations({
  items,
  transportItems,
  preGstDeductions,
  postGstDeductions,
  includeGST,
  showTransport,
  gstPercentage,
}) {
  return useMemo(() => {
    const calculator = new InvoiceCalculationHandler({
      items,
      transportItems: showTransport ? transportItems : [],
      preGstDeductions,
      postGstDeductions,
      includeGST,
      gstPercentage,
    });
    return calculator.getCalculations();
  }, [
    items,
    transportItems,
    preGstDeductions,
    postGstDeductions,
    includeGST,
    showTransport,
    gstPercentage,
  ]);
}