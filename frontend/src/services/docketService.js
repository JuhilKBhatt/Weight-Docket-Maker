// ./frontend/src/services/docketService.js

import axios from 'axios';

const API = 'http://localhost:8000/api/dockets';

const docketService = {
  createNewDocket: async () => {
    const res = await axios.post(`${API}/new`);
    return res.data.scrdkt_id;
  },
};

export default docketService;