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
  const safeValue = (val, fallback = "") => val ?? fallback;

  const payload = {
    scrinv_number: scrinvID,
    is_paid: false,
    invoice_type: invoiceType,
    include_gst: includeGST,
    show_transport: showTransport,
    invoice_date: values.date ? values.date.format('YYYY-MM-DD') : null,
    notes: safeValue(values.notes, ""),

    bill_from_name: safeValue(values.bill_from_name, values.fromCompanyName),
    bill_from_phone: safeValue(values.bill_from_phone, values.fromCompanyPhone),
    bill_from_email: safeValue(values.bill_from_email, values.fromCompanyEmail),
    bill_from_abn: safeValue(values.bill_from_abn, values.fromCompanyABN),
    bill_from_address: safeValue(values.bill_from_address, values.fromCompanyAddress),

    bill_to_name: safeValue(values.bill_to_name, values.toCompanyName),
    bill_to_phone: safeValue(values.bill_to_phone, values.toCompanyPhone),
    bill_to_email: safeValue(values.bill_to_email, values.toCompanyEmail),
    bill_to_abn: safeValue(values.bill_to_abn, values.toCompanyABN),
    bill_to_address: safeValue(values.bill_to_address, values.toCompanyAddress),

    bank_name: safeValue(values.bank_name, values.bankName),
    account_name: safeValue(values.account_name, values.accName),
    bsb: safeValue(values.bsb, values.BSB),
    account_number: safeValue(values.account_number, values.accountNumber),

    items: items.map(i => {
      const base = {
        description: safeValue(i.description),
        quantity: Number(i.quantity ?? 0),
        price: Number(i.price ?? 0),
      };

      if (invoiceType === "Container") {
        return {
          ...base,
          seal: safeValue(i.seal),
          container_number: safeValue(i.containerNumber),
          metal: safeValue(i.metal, ""),
        };
      }

      if (invoiceType === "Pickup") {
        return {
          ...base,
          // For Pickup, we map the UI field 'containerNumber' to 'metal' or similar if that's your logic, 
          // but based on your schema 'container_number' is likely what you want.
          container_number: safeValue(i.containerNumber, ""), 
          seal: safeValue(i.seal, ""),
          metal: safeValue(i.metal, ""), 
        };
      }
      return base;
    }),

    transport_items: transportItems.map(t => ({
      name: safeValue(t.name),
      num_of_ctr: Number(t.numOfCtr ?? 0),
      price_per_ctr: Number(t.pricePerCtr ?? 0),
    })),

    deductions: [
      ...preGstDeductions.map(d => ({ type: "pre", label: safeValue(d.label), amount: Number(d.amount ?? 0) })),
      ...postGstDeductions.map(d => ({ type: "post", label: safeValue(d.label), amount: Number(d.amount ?? 0) })),
    ]
  };

  try {
    const res = await axios.post("http://localhost:8000/api/invoices/save", payload);
    return res.data;
  } catch (err) {
    console.error("Error saving invoice:", err);
    throw err;
  }
};

export const selectorData = async () => {
  try {
    const res = await axios.get("http://localhost:8000/api/invoices/selectorsData");
    return res.data;
  } catch (err) {
    return { companies_from: [], companies_to: [], accounts: [] };
  }
};