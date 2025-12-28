import { useState, useEffect } from 'react';
import { selectorData } from '../../scripts/utilities/invoiceUtils';

export default function useInvoiceSelectors() {
  const [savedCompaniesFrom, setSavedCompaniesFrom] = useState([]);
  const [savedCompaniesTo, setSavedCompaniesTo] = useState([]);
  const [savedAccounts, setSavedAccounts] = useState([]);

  useEffect(() => {
    async function loadSelectors() {
      try {
        const data = await selectorData();
        setSavedCompaniesFrom(data.companies_from || []);
        setSavedCompaniesTo(data.companies_to || []);
        setSavedAccounts(data.accounts || []);
      } catch (err) {
        console.error("Failed to load selector data", err);
      }
    }
    loadSelectors();
  }, []);

  return { savedCompaniesFrom, savedCompaniesTo, savedAccounts };
}