// ./frontend/src/services/invoiceService.js

import axios from 'axios';

const API = 'http://localhost:8000/api/invoices';

const invoiceNewSCRIDService = {
  createNewInvoice: async () => {
    const res = await axios.post(`${API}/new`);
    return res.data.scrinv_id;
  },
};

export default invoiceNewSCRIDService;