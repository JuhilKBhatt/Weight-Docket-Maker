// ./frontend/src/services/invoiceService.js

import axios from 'axios';

const API = 'http://localhost:8000/invoice';

export default {
  create(payload) {
    return axios.post(`${API}/create`, payload);
  },

  getByScr(scrNumber) {
    return axios.get(`${API}/${scrNumber}`).then(r => r.data);
  },
};