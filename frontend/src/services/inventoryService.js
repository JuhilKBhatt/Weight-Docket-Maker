// src/services/inventoryService.js
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/dockets';

export const getInventoryReport = async (startDate, endDate, metalSearch) => {
  const params = {
    start_date: startDate,
    end_date: endDate,
  };
  
  if (metalSearch) {
    params.metal = metalSearch;
  }

  const response = await axios.get(`${API_URL}/inventory-report`, { params });
  return response.data;
};