// src/services/docketListService.js

import axios from 'axios';

const API_URL = 'http://localhost:8000/api/dockets';

export const getAllDockets = async (page = 1, limit = 10, search = '', startDate = null, endDate = null) => {
  const params = {
    page,
    limit,
    search,
    start_date: startDate,
    end_date: endDate,
    _t: new Date().getTime() // Cache buster
  };
  const response = await axios.get(`${API_URL}/list`, { params });
  return response.data;
};

export const deleteDocketById = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};