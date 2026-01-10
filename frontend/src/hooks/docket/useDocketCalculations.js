// src/hooks/docket/useDocketCalculations.js

import { useMemo } from 'react';
import DocketCalculationHandler from '../../scripts/DocketCalculationHandler';

export default function useDocketCalculations({
  items,
  preGstDeductions,
  postGstDeductions,
  includeGST,
  gstPercentage,
}) {
  return useMemo(() => {
    const calculator = new DocketCalculationHandler({
      items,
      preGstDeductions,
      postGstDeductions,
      includeGST,
      gstPercentage,
    });
    return calculator.getCalculations();
  }, [
    items,
    preGstDeductions,
    postGstDeductions,
    includeGST,
    gstPercentage,
  ]);
}