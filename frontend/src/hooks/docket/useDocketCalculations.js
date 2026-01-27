// src/hooks/docket/useDocketCalculations.js

import { useMemo, useState, useEffect, useRef } from 'react';
import DocketCalculationHandler from '../../scripts/DocketCalculationHandler';

export default function useDocketCalculations({
  items,
  preGstDeductions,
  postGstDeductions,
  includeGST,
  gstPercentage,
}) {
  // We keep a local state for the *results* to decouple render cycles
  const [results, setResults] = useState({
      itemsWithTotals: items, // Initial state matches input
      itemsTotal: 0,
      preGstDeductionTotal: 0,
      postGstDeductionTotal: 0,
      grossTotal: 0,
      gstAmount: 0,
      finalTotal: 0
  });

  const timerRef = useRef(null);

  // 1. Instant Row Updates (For UX Responsiveness)
  const instantRows = useMemo(() => {
      const handler = new DocketCalculationHandler({ items });
      return handler.calculateItemTotals();
  }, [items]);

  // 2. Debounced Totals Calculation (For Performance)
  // Summing up everything happens 200ms after the user stops typing.
  useEffect(() => {
      if (timerRef.current) {
          clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
          const calculator = new DocketCalculationHandler({
              items: instantRows, // Use the already calculated rows
              preGstDeductions,
              postGstDeductions,
              includeGST,
              gstPercentage,
          });
          
          const fullCalcs = calculator.getCalculations();
          
          // Only update state if values actually changed (prevents re-renders)
          setResults(prev => {
              if (
                  prev.finalTotal !== fullCalcs.finalTotal ||
                  prev.gstAmount !== fullCalcs.gstAmount ||
                  prev.grossTotal !== fullCalcs.grossTotal
              ) {
                  return fullCalcs;
              }
              return prev;
          });
      }, 200); // 200ms debounce

      return () => clearTimeout(timerRef.current);
  }, [instantRows, preGstDeductions, postGstDeductions, includeGST, gstPercentage]);

  // Return the instant rows (for the table) combined with the debounced totals (for the summary)
  return {
      ...results,
      itemsWithTotals: instantRows // Always use instant rows for rendering
  };
}