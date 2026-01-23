// ./frontend/src/services/docketService.js

import axios from 'axios';

const API = 'http://localhost:8000/api/dockets';

const docketService = {
  createNewDocket: async () => {
    const res = await axios.post(`${API}/new`);
    return res.data.scrdkt_id;
  },

  getUniqueCustomers: async (search = '') => {
    const params = { 
      q: search || '', 
      _t: new Date().getTime() 
    };
    const res = await axios.get(`${API}/customers/unique`, { params });
    return res.data;
  },

  getUniqueMetals: async (search = '', customerName = '') => {
    const params = { 
        q: search,
        customer: customerName,
        _t: new Date().getTime() 
    };
    const res = await axios.get(`${API}/metals/unique`, { params });
    return res.data;
  }
};

export default docketService;