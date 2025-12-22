// ./frontend/src/hooks/invoice/useScrLookup.js

import { useEffect } from 'react';
import invoiceService from '../../services/invoiceService';

export default function useScrLookup(scrNumber, setFormValues) {
  useEffect(() => {
    if (!scrNumber) return;

    invoiceService.getByScr(scrNumber).then((data) => {
      setFormValues({
        fromCompanyName: data.fromCompany.name,
        toCompanyName: data.toCompany.name,
        date: data.date,
      });
    });
  }, [scrNumber]);
}