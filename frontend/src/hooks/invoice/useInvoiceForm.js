// ./frontend/src/hooks/invoice/useInvoiceForm.js

import { useState, useRef, useEffect } from 'react';
import invoiceNewSCRIDService from '../../services/invoiceService';

const uid = (() => {
  let id = 0;
  return () => ++id;
})();

/**
 * mode: 'new' | 'edit' | 'view'
 * existingInvoice: optional object with existing invoice data for edit/view
 */
export default function useInvoiceForm(mode = 'new', existingInvoice = null) {
  const defaultItems = [
    { key: uid(), seal:'', container: '', metal:'', description: '', weight: 0, price: 0 },
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

  // --- STATE INITIALIZATION WITH MAPPING ---

  // 1. ITEMS (Map 'container_number' -> 'container', 'quantity' -> 'weight')
  const [items, setItems] = useState(() => {
    if (existingInvoice?.items && existingInvoice.items.length > 0) {
      return existingInvoice.items.map(i => ({
        key: i.key || uid(),
        seal: i.seal || '',
        container: i.container || i.container_number || '', // Backend: container_number
        metal: i.metal || '',
        description: i.description || '',
        weight: i.weight ?? i.quantity ?? 0,                // Backend: quantity
        price: i.price ?? 0,
      }));
    }
    return defaultItems;
  });

  // 2. TRANSPORT (Map 'num_of_ctr' -> 'NumOfCTR', 'price_per_ctr' -> 'PricePreCTR')
  const [transportItems, setTransportItems] = useState(() => {
    if (existingInvoice?.transportItems && existingInvoice.transportItems.length > 0) {
      return existingInvoice.transportItems.map(t => ({
        key: t.key || uid(),
        name: t.name || '',
        NumOfCTR: t.NumOfCTR ?? t.num_of_ctr ?? 0,          // Backend: num_of_ctr
        PricePreCTR: t.PricePreCTR ?? t.price_per_ctr ?? 0  // Backend: price_per_ctr
      }));
    }
    return [];
  });

  // 3. DEDUCTIONS (Map standard fields if needed)
  const [preGstDeductions, setPreGstDeductions] = useState(() => {
    if (existingInvoice?.preGstDeductions) {
      return existingInvoice.preGstDeductions.map(d => ({ 
        key: d.key || uid(), 
        label: d.label || '', 
        amount: d.amount || 0 
      }));
    }
    return [];
  });

  const [postGstDeductions, setPostGstDeductions] = useState(() => {
    if (existingInvoice?.postGstDeductions) {
      return existingInvoice.postGstDeductions.map(d => ({ 
        key: d.key || uid(), 
        label: d.label || '', 
        amount: d.amount || 0 
      }));
    }
    return [];
  });

  const [invoiceType, setInvoiceType] = useState(existingInvoice?.invoiceType || existingInvoice?.invoice_type || 'Container');
  const [includeGST, setIncludeGST] = useState(existingInvoice?.includeGST ?? existingInvoice?.include_gst ?? true);
  const [showTransport, setShowTransport] = useState(existingInvoice?.showTransport ?? existingInvoice?.show_transport ?? false);

  // ITEM HANDLERS
  const handleItemChange = (key, field, value) => setItems(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));
  const addRow = () => setItems(prev => [...prev, { key: uid(), description: '', weight: 0, price: 0 }]);
  const removeRow = key => setItems(prev => prev.filter(item => item.key !== key));

  // TRANSPORT HANDLERS
  const handleTransportChange = (key, field, value) => setTransportItems(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));

  // DEDUCTIONS
  const addDeduction = type => {
    const deduction = { key: uid(), label: '', amount: 0 };
    type === 'pre' ? setPreGstDeductions(prev => [...prev, deduction]) : setPostGstDeductions(prev => [...prev, deduction]);
  };
  const removeDeduction = (type, key) => type === 'pre' ? setPreGstDeductions(prev => prev.filter(d => d.key !== key)) : setPostGstDeductions(prev => prev.filter(d => d.key !== key));
  const handleDeductionChange = (type, key, field, value) => {
    const setter = type === 'pre' ? setPreGstDeductions : setPostGstDeductions;
    setter(prev => prev.map(d => d.key === key ? { ...d, [field]: value } : d));
  };

  // TRANSPORT TOGGLE
  const toggleTransport = value => {
    setShowTransport(value);
    if (value && transportItems.length === 0) {
      setTransportItems([
        { key: uid(), name: invoiceType === 'Pickup' ? 'Pickup' : 'Container', NumOfCTR: 0, PricePreCTR: 0 },
        { key: uid(), name: 'Overweight', NumOfCTR: 0, PricePreCTR: 0 },
      ]);
    }
    if (!value) setTransportItems([]);
  };

  // RESET
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