// src/hooks/invoice/useInvoiceCalculations.js

import { useMemo, useState, useEffect, useRef } from 'react';
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
  // Initialize with default zero values
  const [totals, setTotals] = useState({
    itemsTotal: 0,
    transportTotal: 0,
    preGstDeductionTotal: 0,
    postGstDeductionTotal: 0,
    grossTotal: 0,
    gstAmount: 0,
    finalTotal: 0,
  });

  const timerRef = useRef(null);

  // 1. Instant Row Updates (Fast)
  // This calculates "Quantity * Price" for every row immediately.
  // We use useMemo dependent only on 'items' to ensure the table feels responsive.
  const itemsWithTotals = useMemo(() => {
    const calculator = new InvoiceCalculationHandler({ items });
    return calculator.calculateItemTotals();
  }, [items]);

  // 2. Debounced Grand Totals (Slow)
  // We sum everything up ~200ms after the user stops typing.
  // This prevents the "TotalsSummary" component from re-rendering on every keystroke.
  useEffect(() => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
        const calculator = new InvoiceCalculationHandler({
            items: itemsWithTotals, // Pass the already calculated rows
            transportItems: showTransport ? transportItems : [],
            preGstDeductions,
            postGstDeductions,
            includeGST,
            gstPercentage,
        });

        // Calculate the full summary
        const results = calculator.getCalculations();

        // Only update state if the final numbers actually changed
        // This prevents unnecessary re-renders of the bottom section
        setTotals(prev => {
            if (
                prev.finalTotal !== results.finalTotal ||
                prev.gstAmount !== results.gstAmount ||
                prev.grossTotal !== results.grossTotal
            ) {
                return results;
            }
            return prev;
        });
    }, 200); // 200ms delay

    return () => clearTimeout(timerRef.current);
  }, [
      itemsWithTotals,
      transportItems,
      preGstDeductions,
      postGstDeductions,
      includeGST,
      showTransport,
      gstPercentage
  ]);

  return {
      itemsWithTotals, // Instant updates for the table
      ...totals        // Debounced updates for the summary
  };
}