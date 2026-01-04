// frontend/src/services/settingsService.js
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/invoices';

export const deleteSelector = async (type, id) => {
  const response = await axios.delete(`${API_URL}/selectors/${type}/${id}`);
  return response.data;
};