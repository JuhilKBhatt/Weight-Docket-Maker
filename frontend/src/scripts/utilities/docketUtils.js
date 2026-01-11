// ./frontend/src/scripts/utilities/docketUtils.js

import axios from "axios";

const API = 'http://localhost:8000/api/dockets';

export const PrintDocket = async ({
  scrdktID,
  status,
  values,
  items,
  deductions,
  totals,
  includeGST,
  gstPercentage
}) => {
  const safeValue = (val, fallback = "") => val ?? fallback;

  // Map Frontend Form -> Backend Schema
  const payload = {
    scrdkt_number: scrdktID,
    docket_date: values.date ? values.date.format('YYYY-MM-DD') : null,
    status: status || "Draft",
    is_saved: values.saveDocket,
    print_Qty: Number(values.printQty),
    
    // Header Data
    docket_type: safeValue(values.docketType, "Customer"),
    company_name: safeValue(values.companyDetails),
    
    // Financials
    include_gst: includeGST,
    gst_percentage: Number(gstPercentage ?? 10),
    
    // Customer Details
    customer_name: safeValue(values.name),
    customer_address: safeValue(values.address),
    customer_phone: safeValue(values.phone),
    customer_abn: safeValue(values.abn),
    customer_license_no: safeValue(values.licenseNo),
    customer_rego_no: safeValue(values.regoNo),
    customer_dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
    customer_pay_id: safeValue(values.payId),
    
    // Bank Details
    bank_bsb: safeValue(values.bsb),
    bank_account_number: safeValue(values.accNo),

    // Notes
    notes: safeValue(values.paperNotes),

    // Items Table (Map 'itemsWithTotals' to schema)
    items: items.map(i => ({
      metal: safeValue(i.metal),
      notes: safeValue(i.notes), 
      gross: Number(i.gross ?? 0),
      tare: Number(i.tare ?? 0),
      price: Number(i.price ?? 0)
    })),

    // Deductions
    deductions: [
      ...deductions.pre.map(d => ({ type: "pre", label: safeValue(d.label), amount: Number(d.amount ?? 0) })),
      ...deductions.post.map(d => ({ type: "post", label: safeValue(d.label), amount: Number(d.amount ?? 0) })),
    ]
  };

  try {
    const res = await axios.post(`${API}/saveDraft`, payload);
    return res.data;
  } catch (err) {
    console.error("Error saving docket:", err);
    throw err;
  }
};