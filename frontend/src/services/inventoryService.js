// src/services/inventoryService.js
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/dockets';

export const getInventoryReport = async (startDate, endDate, metalSearch, docketType) => {
  const params = {
    start_date: startDate,
    end_date: endDate,
  };
  
  if (metalSearch) {
    params.metal = metalSearch;
  }

  // Pass docket type if selected
  if (docketType && docketType !== 'All') {
    params.docket_type = docketType;
  }

  const response = await axios.get(`${API_URL}/inventory-report`, { params });
  return response.data;
};