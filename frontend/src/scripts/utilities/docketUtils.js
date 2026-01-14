// ./frontend/src/scripts/utilities/docketUtils.js

import axios from "axios";
import dayjs from "dayjs";

const API = 'http://localhost:8000/api/dockets';

export const SaveDocket = async ({
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
  
  let formattedDate = null;
  if (values.date) {
      if (dayjs.isDayjs(values.date) && values.date.isValid()) {
          formattedDate = values.date.format('YYYY-MM-DD');
      } else if (typeof values.date === 'string') {
          formattedDate = values.date.substring(0, 10);
      }
  }

  let formattedTime = null;
  if(values.time){
      if(dayjs.isDayjs(values.time) && values.time.isValid()){
          formattedTime = values.time.format('HH:mm a');
      } else if (typeof values.time === 'string'){
          formattedTime = values.time;
      }
  }
  
  // Map Frontend Form -> Backend Schema
  const payload = {
    scrdkt_number: scrdktID,
    docket_date: formattedDate,
    docket_time: formattedTime,
    status: status || "Draft",
    is_saved: values.saveDocket,
    print_qty: Number(values.printQty),
    
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
    // Ensure DOB is also formatted correctly if present
    customer_dob: values.dob ? (dayjs.isDayjs(values.dob) ? values.dob.format('YYYY-MM-DD') : values.dob) : null,
    customer_pay_id: safeValue(values.payId),
    
    // Bank Details
    bank_bsb: safeValue(values.bsb),
    bank_account_number: safeValue(values.accNo),

    // Notes
    notes: safeValue(values.paperNotes),

    // Items Table
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
    const res = await axios.post(`${API}/saveDocket`, payload);
    console.log("Docket saved:", payload);
    return res.data;
  } catch (err) {
    console.error("Error saving docket:", err);
    throw err;
  }
};

export const PrintDocket = async (docketId, copies) => {
  try {
    const res = await axios.post(`${API}/${docketId}/print?copies=${copies}`);
    return res.data;
  } catch (err) {
    console.error("Error printing docket:", err);
    throw err;
  }
};

export const DownloadPDFDocket = async (docketId, scrdktID) => {
  try {
      const response = await axios.get(`${API}/${docketId}/download`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    // We can still use the SCR ID for the filename so it looks nice for the user
    link.setAttribute('download', `Docket_${scrdktID}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  } catch (error) {
    console.error('Error downloading PDF docket:', error);
    throw error;
  }
};