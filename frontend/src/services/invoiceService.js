// ./frontend/src/services/invoiceService.js

import axios from 'axios';

const API = 'http://localhost:8000/api/invoices';

const invoiceNewSCRIDService = {
  createNewInvoice: async () => {
    const res = await axios.post(`${API}/new`);
    return res.data.scrinv_id;
  },

  sendInvoiceEmail: async (id, payload) => {
    // payload: { recipient, subject, body }
    const res = await axios.post(`${API}/${id}/email`, payload);
    return res.data;
  }
};

export default invoiceNewSCRIDService;