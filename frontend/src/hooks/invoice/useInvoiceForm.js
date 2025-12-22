// ./frontend/src/hooks/invoice/useInvoiceForm.js

import { useState } from 'react';

export default function useInvoiceForm() {
  const [items, setItems] = useState([
    { key: Date.now() + 1, seal: '', container: '', description: '', weight: undefined, price: undefined },
    { key: Date.now() + 2, seal: '', container: '', description: '', weight: undefined, price: undefined },
  ]);

  const [transportItems, setTransportItems] = useState([
    { key: '1', name: 'Containers', NumOfCTR: undefined, PricePreCTR: undefined },
    { key: '2', name: 'Overweight', NumOfCTR: undefined, PricePreCTR: undefined },
  ]);

  const [preGstDeductions, setPreGstDeductions] = useState([]);
  const [postGstDeductions, setPostGstDeductions] = useState([]);

  const [invoiceType, setInvoiceType] = useState('Container');
  const [includeGST, setIncludeGST] = useState(true);
  const [showTransport, setShowTransport] = useState(false);

  // ---------- handlers ----------
  const handleItemChange = (key, field, value) => {
    setItems(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i));
  };

  const handleTransportChange = (key, field, value) => {
    setTransportItems(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i));
  };

  const handleDeductionChange = (type, key, field, value) => {
    const setter = type === 'pre' ? setPreGstDeductions : setPostGstDeductions;
    setter(prev => prev.map(d => d.key === key ? { ...d, [field]: value } : d));
  };

  const addRow = () =>
    setItems(prev => [...prev, { key: Date.now(), weight: undefined, price: undefined }]);

  const removeRow = (key) =>
    setItems(prev => prev.filter(i => i.key !== key));

  const addDeduction = (type) => {
    const newD = { key: Date.now(), label: '', amount: undefined };
    type === 'pre'
      ? setPreGstDeductions(prev => [...prev, newD])
      : setPostGstDeductions(prev => [...prev, newD]);
  };

  const removeDeduction = (type, key) => {
    type === 'pre'
      ? setPreGstDeductions(prev => prev.filter(d => d.key !== key))
      : setPostGstDeductions(prev => prev.filter(d => d.key !== key));
  };

  return {
    items,
    transportItems,
    preGstDeductions,
    postGstDeductions,
    invoiceType,
    includeGST,
    showTransport,

    setInvoiceType,
    setIncludeGST,
    setShowTransport,

    handleItemChange,
    handleTransportChange,
    handleDeductionChange,
    addRow,
    removeRow,
    addDeduction,
    removeDeduction,
  };
}