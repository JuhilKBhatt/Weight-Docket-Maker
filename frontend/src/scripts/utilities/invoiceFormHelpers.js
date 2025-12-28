import dayjs from 'dayjs';

/**
 * Maps the backend invoice model to the Ant Design Form initial values.
 */
export const getInitialValues = (existingInvoice) => {
  return {
    ...existingInvoice,

    // IDs and Flags
    scrinvID: existingInvoice?.scrinv_number,
    invoiceType: existingInvoice?.invoice_type,
    notes: existingInvoice?.notes || "",
    includeGST: existingInvoice?.include_gst,
    showTransport: existingInvoice?.show_transport,

    // Date Handling
    date: existingInvoice?.invoice_date ? dayjs(existingInvoice.invoice_date) : dayjs(),

    // Bill From
    fromCompanyName: existingInvoice?.bill_from_name,
    fromCompanyPhone: existingInvoice?.bill_from_phone,
    fromCompanyEmail: existingInvoice?.bill_from_email,
    fromCompanyABN: existingInvoice?.bill_from_abn,
    fromCompanyAddress: existingInvoice?.bill_from_address,

    // Bill To
    toCompanyName: existingInvoice?.bill_to_name,
    toCompanyPhone: existingInvoice?.bill_to_phone,
    toCompanyEmail: existingInvoice?.bill_to_email,
    toCompanyABN: existingInvoice?.bill_to_abn,
    toCompanyAddress: existingInvoice?.bill_to_address,

    // Bank Details
    bankName: existingInvoice?.bank_name,
    accName: existingInvoice?.account_name,
    bsb: existingInvoice?.bsb,
    accountNumber: existingInvoice?.account_number
  };
};