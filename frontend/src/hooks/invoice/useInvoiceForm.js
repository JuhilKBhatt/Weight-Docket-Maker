// ./frontend/src/hooks/invoice/useInvoiceForm.js

import { useState } from 'react';

export default function useInvoiceForm() {
  const [items, setItems] = useState([]);
  const [transportItems, setTransportItems] = useState([]);
  const [preGstDeductions, setPreGstDeductions] = useState([]);
  const [postGstDeductions, setPostGstDeductions] = useState([]);
  const [invoiceType, setInvoiceType] = useState('Container');
  const [includeGST, setIncludeGST] = useState(true);
  const [showTransport, setShowTransport] = useState(false);

  const handleItemChange = (key, field, value) => {
    setItems(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i));
  };

  const addRow = () =>
    setItems(prev => [...prev, { key: Date.now(), weight: undefined, price: undefined }]);

  const removeRow = (key) =>
    setItems(prev => prev.filter(i => i.key !== key));

  return {
    items,
    transportItems,
    preGstDeductions,
    postGstDeductions,
    invoiceType,
    includeGST,
    showTransport,

    setItems,
    setTransportItems,
    setPreGstDeductions,
    setPostGstDeductions,
    setInvoiceType,
    setIncludeGST,
    setShowTransport,

    handleItemChange,
    addRow,
    removeRow,
  };
}