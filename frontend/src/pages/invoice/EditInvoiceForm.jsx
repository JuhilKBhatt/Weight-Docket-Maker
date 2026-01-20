// ./frontend/src/pages/EditInvoiceForm.jsx

import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { App } from 'antd';
import axios from 'axios';
import InvoiceForm from './InvoiceForm';

const API = 'http://localhost:8000/api/invoices';

export default function EditInvoice() {
  const { message } = App.useApp();
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    async function loadInvoice() {
      const res = await axios.get(`${API}/${id}`);
      const data = res.data;

      // ---- NORMALIZE FIELDS FOR THE FORM ----
      const normalized = {
        id: data.id,

        // SCR Number
        scrinv_number: data.scrinv_number,

        // Booleans
        invoiceType: data.invoice_type,
        includeGST: data.include_gst,
        showTransport: data.show_transport,

        // Items (give each one a "key")
        items: (data.line_items || []).map(i => ({
          key: i.id,
          ...i
        })),

        transportItems: (data.transport_items || []).map(t => ({
          key: t.id,
          ...t
        })),

        preGstDeductions: (data.pre_gst_deductions || []).map(d => ({
          key: d.id,
          ...d
        })),

        postGstDeductions: (data.post_gst_deductions || []).map(d => ({
          key: d.id,
          ...d
        })),

        // Billing + Bank stay as-is (Form handles values)
        ...data
      };

      console.log('Normalized Invoice:', normalized);
      setInvoice(normalized);
    }
    message.info('Invoice loaded for editing.');
    loadInvoice();
  }, [id]);

  if (!invoice) return <div>Loading…</div>;

  return <InvoiceForm mode="edit" existingInvoice={invoice} />;
}