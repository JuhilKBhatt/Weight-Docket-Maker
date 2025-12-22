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
}) {
  return useMemo(() => {
    const calculator = new InvoiceCalculationHandler({
      items,
      transportItems: showTransport ? transportItems : [],
      preGstDeductions,
      postGstDeductions,
      includeGST,
    });
    return calculator.getCalculations();
  }, [
    items,
    transportItems,
    preGstDeductions,
    postGstDeductions,
    includeGST,
    showTransport,
  ]);
}