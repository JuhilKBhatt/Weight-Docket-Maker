// ./frontend/src/hooks/invoice/useInvoiceForm.js

import { useState, useRef, useEffect } from 'react';
import invoiceNewSCRIDService from '../../services/invoiceService';

const uid = (() => {
  let id = 0;
  return () => ++id;
})();

export default function useInvoiceForm(mode = 'new', existingInvoice = null) {
  const defaultItems = [
    { key: uid(), seal: '', containerNumber: '', metal: '', description: '', quantity: 0, price: 0 },
  ];

  // SCRINV ID
  const [scrinvID, setScrinvID] = useState(() => {
    if (existingInvoice?.scrinv_number) return existingInvoice.scrinv_number;
    return localStorage.getItem("scrinvID") || null;
  });

  const called = useRef(false);

  useEffect(() => {
    if (mode === 'new' && !called.current && !scrinvID) {
      called.current = true;
      invoiceNewSCRIDService.createNewInvoice().then(id => {
        setScrinvID(id);
        localStorage.setItem("scrinvID", id);
      });
    }
  }, [mode, scrinvID]);

  // --- 1. ITEMS ---
  const [items, setItems] = useState(() => {
    if (existingInvoice?.items && existingInvoice.items.length > 0) {
      return existingInvoice.items.map(i => ({
        key: i.key || uid(),
        seal: i.seal || '',
        containerNumber: i.container_number || '', // Map backend snake_case to frontend camelCase
        metal: i.metal || '',
        description: i.description || '',
        quantity: i.quantity ?? 0,
        price: i.price ?? 0,
      }));
    }
    return defaultItems;
  });

  // --- 2. TRANSPORT ---
  const [transportItems, setTransportItems] = useState(() => {
    if (existingInvoice?.transport_items && existingInvoice.transport_items.length > 0) {
      return existingInvoice.transport_items.map(t => ({
        key: t.key || uid(),
        name: t.name || '',
        numOfCtr: t.num_of_ctr ?? 0,          // Map backend snake_case to frontend camelCase
        pricePerCtr: t.price_per_ctr ?? 0     // Map backend snake_case to frontend camelCase
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
        amount: d.amount || 0
      }));
    }
    return [];
  });

  const [postGstDeductions, setPostGstDeductions] = useState(() => {
    if (existingInvoice?.post_gst_deductions) {
      return existingInvoice.post_gst_deductions.map(d => ({
        key: d.key || uid(),
        label: d.label || '',
        amount: d.amount || 0
      }));
    }
    return [];
  });

  const [invoiceType, setInvoiceType] = useState(existingInvoice?.invoice_type || 'Container');
  const [includeGST, setIncludeGST] = useState(existingInvoice?.include_gst ?? true);
  const [showTransport, setShowTransport] = useState(existingInvoice?.show_transport ?? false);

  // GENERIC HANDLERS
  const handleItemChange = (key, field, value) => setItems(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));
  const addRow = () => setItems(prev => [...prev, { key: uid(), description: '', quantity: 0, price: 0, containerNumber: '', seal: '', metal: '' }]);
  const removeRow = key => setItems(prev => prev.filter(item => item.key !== key));

  const handleTransportChange = (key, field, value) => setTransportItems(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));

  const addDeduction = type => {
    const deduction = { key: uid(), label: '', amount: 0 };
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
        { key: uid(), name: invoiceType === 'Pickup' ? 'Pickup' : 'Container', numOfCtr: 0, pricePerCtr: 0 },
        { key: uid(), name: 'Overweight', numOfCtr: 0, pricePerCtr: 0 },
      ]);
    }
    if (!value) setTransportItems([]);
  };

  const resetInvoice = () => {
    setItems(defaultItems);
    setTransportItems([]);
    setPreGstDeductions([]);
    setPostGstDeductions([]);
    setInvoiceType('Container');
    setIncludeGST(true);
    setShowTransport(false);
    localStorage.removeItem("scrinvID");
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
    showTransport,
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
  };
}