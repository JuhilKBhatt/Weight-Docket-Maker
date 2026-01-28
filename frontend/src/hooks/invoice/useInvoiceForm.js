// src/hooks/invoice/useInvoiceForm.js

import { useState, useRef, useEffect } from 'react';
import invoiceNewSCRIDService from '../../services/invoiceService';

const uid = (() => {
  let id = 0;
  return () => ++id;
})();

export default function useInvoiceForm(mode = 'new', existingInvoice = null) {
  // NEW: State for the default unit (e.g. 't', 'kg')
  const [defaultUnit, setDefaultUnit] = useState('t');

  // Initializing with null to keep fields empty
  const defaultItems = [
    { key: uid(), seal: '', containerNumber: '', metal: '', description: '', quantity: null, price: null, unit: defaultUnit },
  ];

  // SCRINV ID
  const [scrinvID, setScrinvID] = useState(() => {
    if (existingInvoice?.scrinv_number) return existingInvoice.scrinv_number;
    return sessionStorage.getItem("scrinvID") || null;
  });

  const called = useRef(false);

  useEffect(() => {
    if (mode === 'new' && !called.current && !scrinvID) {
      called.current = true;
      invoiceNewSCRIDService.createNewInvoice().then(id => {
        setScrinvID(id);
        sessionStorage.setItem("scrinvID", id);
      });
    }
  }, [mode, scrinvID]);

  // --- 1. ITEMS ---
  const [items, setItems] = useState(() => {
    const sourceItems = existingInvoice?.line_items || existingInvoice?.items;
    if (sourceItems && sourceItems.length > 0) {
      return sourceItems.map(i => ({
        key: i.key || i.id || uid(),
        seal: i.seal || '',
        containerNumber: i.container_number || '', 
        metal: i.metal || '',
        description: i.description || '',
        quantity: i.quantity || null,
        price: i.price || null,
        unit: i.unit || 't',
      }));
    }
    return defaultItems;
  });

  // --- 2. TRANSPORT ---
  const [transportItems, setTransportItems] = useState(() => {
    if (existingInvoice?.transport_items && existingInvoice.transport_items.length > 0) {
      return existingInvoice.transport_items.map(t => ({
        key: t.key || t.id || uid(),
        name: t.name || '',
        numOfCtr: t.num_of_ctr || null,
        pricePerCtr: t.price_per_ctr || null
      }));
    }
    return [];
  });

  // --- 3. DEDUCTIONS ---
  const [preGstDeductions, setPreGstDeductions] = useState(() => {
    if (existingInvoice?.pre_gst_deductions) {
      return existingInvoice.pre_gst_deductions.map(d => ({
        key: d.key || uid(),
        label: d.label || '',
        // UPDATED: Convert 0 to null so input is empty
        amount: d.amount === 0 ? null : d.amount
      }));
    }
    return [];
  });

  const [postGstDeductions, setPostGstDeductions] = useState(() => {
    if (existingInvoice?.post_gst_deductions) {
      return existingInvoice.post_gst_deductions.map(d => ({
        key: d.key || uid(),
        label: d.label || '',
        // UPDATED: Convert 0 to null so input is empty
        amount: d.amount === 0 ? null : d.amount
      }));
    }
    return [];
  });

  const [invoiceType, setInvoiceType] = useState(existingInvoice?.invoice_type || 'Container');
  const [includeGST, setIncludeGST] = useState(existingInvoice?.include_gst ?? true);
  const [gstPercentage, setGstPercentage] = useState(existingInvoice?.gst_percentage ?? 10);
  const [showTransport, setShowTransport] = useState(existingInvoice?.show_transport ?? false);
  const [currency, setCurrency] = useState(existingInvoice?.currency || 'AUD');

  // GENERIC HANDLERS
  const handleItemChange = (key, field, value) => setItems(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));
  
  const addRow = () => setItems(prev => [...prev, { key: uid(), description: '', quantity: null, price: null, containerNumber: '', seal: '', metal: '', unit: defaultUnit }]);
  
  const removeRow = key => setItems(prev => prev.filter(item => item.key !== key));

  const handleTransportChange = (key, field, value) => setTransportItems(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));

  const addDeduction = type => {
    // UPDATED: Initialize amount as null instead of 0
    const deduction = { key: uid(), label: '', amount: null };
    type === 'pre' ? setPreGstDeductions(prev => [...prev, deduction]) : setPostGstDeductions(prev => [...prev, deduction]);
  };
  const removeDeduction = (type, key) => type === 'pre' ? setPreGstDeductions(prev => prev.filter(d => d.key !== key)) : setPostGstDeductions(prev => prev.filter(d => d.key !== key));
  
  const handleDeductionChange = (type, key, field, value) => {
    const setter = type === 'pre' ? setPreGstDeductions : setPostGstDeductions;
    setter(prev => prev.map(d => d.key === key ? { ...d, [field]: value } : d));
  };

  const toggleTransport = value => {
    setShowTransport(value);
    if (value && transportItems.length === 0) {
      setTransportItems([
        { key: uid(), name: invoiceType === 'Pickup' ? 'Pickup' : 'Container', numOfCtr: null, pricePerCtr: null },
        { key: uid(), name: 'Overweight', numOfCtr: null, pricePerCtr: null },
      ]);
    }
    if (!value) setTransportItems([]);
  };

  const resetInvoice = () => {
    setItems([{ key: uid(), seal: '', containerNumber: '', metal: '', description: '', quantity: null, price: null, unit: defaultUnit }]); 
    setTransportItems([]);
    setPreGstDeductions([]);
    setPostGstDeductions([]);
    setInvoiceType('Container');
    setIncludeGST(true);
    setGstPercentage(10);
    setShowTransport(false);
    setCurrency('AUD');
    sessionStorage.removeItem("scrinvID");
    setScrinvID(null);
  };

  return {
    items,
    transportItems,
    preGstDeductions,
    postGstDeductions,
    scrinvID,
    invoiceType,
    includeGST,
    gstPercentage,
    setGstPercentage,
    showTransport,
    currency,
    setCurrency,
    setInvoiceType,
    setIncludeGST,
    setShowTransport: toggleTransport,
    handleItemChange,
    handleTransportChange,
    handleDeductionChange,
    addRow,
    removeRow,
    addDeduction,
    removeDeduction,
    resetInvoice,
    setDefaultUnit, 
  };
}