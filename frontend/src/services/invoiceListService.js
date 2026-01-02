// frontend/src/services/invoiceListService.js

import axios from 'axios';

const API_URL = 'http://localhost:8000/api/invoices';

// Get all invoices
export const getAllInvoices = async () => {
  const response = await axios.get(`${API_URL}/list`);
  console.log('Fetched Invoices:', response.data); // Debug log
  return response.data;
};

// Delete an invoice
export const deleteInvoiceById = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};

// Update status (handles paid, unpaid, sent, draft)
// This assumes your backend has endpoints like: /api/invoices/:id/status/:statusType
export const updateInvoiceStatus = async (id, statusType) => {
  // statusType should be 'paid', 'unpaid', 'sent', or 'draft'
  const response = await axios.post(`${API_URL}/${id}/status/${statusType}`);
  return response.data;
};

export const updatePrivateNotes = async (id, notes) => {
  const response = await axios.patch(`${API_URL}/${id}/private-notes`, { 
    private_notes: notes 
  });
  return response.data;
};