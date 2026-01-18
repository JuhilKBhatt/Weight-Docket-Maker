// ./frontend/src/hooks/invoice/useInvoiceForm.js

import { useState, useRef, useEffect } from 'react';
import invoiceNewSCRIDService from '../../services/invoiceService';

const uid = (() => {
  let id = 0;
  return () => ++id;
})();

export default function useInvoiceForm(mode = 'new', existingInvoice = null) {
  // NEW: State for the default unit (e.g. 't', 'kg')
  const [defaultUnit, setDefaultUnit] = useState('t');

  const defaultItems = [
    { key: uid(), seal: '', containerNumber: '', metal: '', description: '', quantity: 0, price: 0, unit: defaultUnit },
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
        quantity: i.quantity ?? 0,
        price: i.price ?? 0,
        unit: i.unit || 't',
      }));
    }
    // Note: This initial state might use the hardcoded 't' until settings load, 
    // but we update defaultUnit via useEffect in the Form.
    return defaultItems;
  });

  // --- 2. TRANSPORT ---
  const [transportItems, setTransportItems] = useState(() => {
    if (existingInvoice?.transport_items && existingInvoice.transport_items.length > 0) {
      return existingInvoice.transport_items.map(t => ({
        key: t.key || t.id || uid(),
        name: t.name || '',
        numOfCtr: t.num_of_ctr ?? 0,
        pricePerCtr: t.price_per_ctr ?? 0
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
  const [gstPercentage, setGstPercentage] = useState(existingInvoice?.gst_percentage ?? 10);
  const [showTransport, setShowTransport] = useState(existingInvoice?.show_transport ?? false);
  const [currency, setCurrency] = useState(existingInvoice?.currency || 'AUD');

  // GENERIC HANDLERS
  const handleItemChange = (key, field, value) => setItems(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));
  
  // UPDATED: Use defaultUnit state for new rows
  const addRow = () => setItems(prev => [...prev, { key: uid(), description: '', quantity: 0, price: 0, containerNumber: '', seal: '', metal: '', unit: defaultUnit }]);
  
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
    setItems([{ key: uid(), seal: '', containerNumber: '', metal: '', description: '', quantity: 0, price: 0, unit: defaultUnit }]); // Use dynamic default
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
    setDefaultUnit, // Export this so the Form can update it
  };
}