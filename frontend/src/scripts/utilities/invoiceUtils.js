// ./frontend/src/utils/invoiceUtils.js
import axios from "axios";

export const saveInvoice = async ({
  scrinvID,
  invoiceType,
  includeGST,
  showTransport,
  items,
  transportItems,
  preGstDeductions,
  postGstDeductions,
  values,
}) => {
  const payload = {
    scrinv_number: scrinvID,
    invoice_type: invoiceType,
    include_gst: includeGST,
    show_transport: showTransport,
    notes: values.notes || "",

    bill_from_name: values.fromCompanyName,
    bill_from_phone: values.fromCompanyPhone,
    bill_from_email: values.fromCompanyEmail,
    bill_from_abn: values.fromCompanyABN,
    bill_from_address: values.fromCompanyAddress,

    bill_to_name: values.toCompanyName,
    bill_to_phone: values.toCompanyPhone || "",
    bill_to_email: values.toCompanyEmail || "",
    bill_to_abn: values.toCompanyABN || "",
    bill_to_address: values.toCompanyAddress || "",

    bank_name: values.bankName,
    account_name: values.accName,
    bsb: values.bsb,
    account_number: values.accountNumber,

    items: items.map(i => ({
      description: i.description,
      quantity: Number(i.quantity),
      price: Number(i.price)
    })),

    transport_items: transportItems.map(t => ({
      name: t.name,
      num_of_ctr: Number(t.NumOfCTR),
      price_per_ctr: Number(t.PricePreCTR)
    })),

    deductions: [
      ...preGstDeductions.map(d => ({
        type: "pre",
        label: d.label,
        amount: Number(d.amount)
      })),
      ...postGstDeductions.map(d => ({
        type: "post",
        label: d.label,
        amount: Number(d.amount)
      })),
    ]
  };

  try {
    await axios.post("http://localhost:8000/api/invoices/save", payload);
    console.log("Invoice saved:", payload);
    alert("Invoice saved!");
  } catch (err) {
    console.error(err);
    console.log("Invoice payload that failed:", payload);
    alert("Failed to save invoice");
  }
};

export const selectorData = async () => {
  try {
    const res = await axios.get("http://localhost:8000/api/invoices/selectorsData");
    return res.data; // { companies_from: [], companies_to: [], accounts: [] }
  } catch (err) {
    console.error("Failed to fetch companies", err);
    return { companies_from: [], companies_to: [], accounts: [] };
  }
};