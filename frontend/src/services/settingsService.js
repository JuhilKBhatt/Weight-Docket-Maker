// frontend/src/services/settingsService.js
import axios from 'axios';

const API_INVOICE = 'http://localhost:8000/api/invoices';
const API_SETTINGS = 'http://localhost:8000/api/settings';
const API_DOCKET = 'http://localhost:8000/api/dockets';

// Existing Selector Delete
export const deleteSelector = async (type, id) => {
  const response = await axios.delete(`${API_INVOICE}/selectors/${type}/${id}`);
  return response.data;
};

// --- Defaults ---
export const getDefaults = async () => {
    const res = await axios.get(`${API_SETTINGS}/defaults`);
    return res.data; 
};
export const updateDefaults = async (settingsArray) => {
    // Array of { key, value }
    const res = await axios.post(`${API_SETTINGS}/defaults`, settingsArray);
    return res.data;
};

// --- Currencies ---
export const getCurrencies = async () => {
    const res = await axios.get(`${API_SETTINGS}/currencies`);
    return res.data;
};
export const addCurrency = async (data) => {
    const res = await axios.post(`${API_SETTINGS}/currencies`, data);
    return res.data;
};
export const deleteCurrency = async (id) => {
    const res = await axios.delete(`${API_SETTINGS}/currencies/${id}`);
    return res.data;
};

// --- Units ---
export const getUnits = async () => {
    const res = await axios.get(`${API_SETTINGS}/units`);
    return res.data;
};
export const addUnit = async (data) => {
    const res = await axios.post(`${API_SETTINGS}/units`, data);
    return res.data;
};
export const deleteUnit = async (id) => {
    const res = await axios.delete(`${API_SETTINGS}/units/${id}`);
    return res.data;
};

// --- Manual Entity Management (Add/Edit) ---
export const saveCompanyFrom = async (data, id=null) => {
    if(id) return axios.put(`${API_SETTINGS}/companies-from/${id}`, data);
    return axios.post(`${API_SETTINGS}/companies-from`, data);
};
export const saveCompanyTo = async (data, id=null) => {
    if(id) return axios.put(`${API_SETTINGS}/companies-to/${id}`, data);
    return axios.post(`${API_SETTINGS}/companies-to`, data);
};
export const saveAccount = async (data, id=null) => {
    if(id) return axios.put(`${API_SETTINGS}/accounts/${id}`, data);
    return axios.post(`${API_SETTINGS}/accounts`, data);
};

// --- System ---
export const forceBackup = async () => {
    const res = await axios.post(`${API_DOCKET}/force-backup`);
    return res.data;
};