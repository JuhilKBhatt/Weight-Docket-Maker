import { useEffect } from 'react';

export default function useInvoiceAutoFill({
  form,
  mode,
  existingInvoice,
  savedCompaniesFrom,
  savedCompaniesTo,
  savedAccounts
}) {
  useEffect(() => {
    if (mode === 'edit' && existingInvoice) {
      const updates = {};

      // Match 'Bill From' Company
      if (savedCompaniesFrom.length > 0 && existingInvoice.bill_from_name) {
        const fromIdx = savedCompaniesFrom.findIndex(c => c.name === existingInvoice.bill_from_name);
        if (fromIdx !== -1) updates.fromSavedCompany = fromIdx;
      }

      // Match 'Bill To' Company
      if (savedCompaniesTo.length > 0 && existingInvoice.bill_to_name) {
        const toIdx = savedCompaniesTo.findIndex(c => c.name === existingInvoice.bill_to_name);
        if (toIdx !== -1) updates.toSavedCompany = toIdx;
      }

      // Match 'Pay To' Account
      if (savedAccounts.length > 0 && existingInvoice.account_name) {
        const accIdx = savedAccounts.findIndex(a => 
          a.account_name === existingInvoice.account_name && 
          a.bank_name === existingInvoice.bank_name
        );
        if (accIdx !== -1) updates.savedAccount = accIdx;
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        form.setFieldsValue(updates);
      }
    }
  }, [mode, existingInvoice, savedCompaniesFrom, savedCompaniesTo, savedAccounts, form]);
}