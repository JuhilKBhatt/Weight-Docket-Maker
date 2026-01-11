// src/services/docketListService.js

import axios from 'axios';

const API_URL = 'http://localhost:8000/api/dockets';

export const getAllDockets = async () => {
  const response = await axios.get(`${API_URL}/list?_t=${new Date().getTime()}`);
  return response.data;
};

export const deleteDocketById = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};