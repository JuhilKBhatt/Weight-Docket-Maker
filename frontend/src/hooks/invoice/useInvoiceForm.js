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
    { key: uid(), seal:'', container_number:'', metal:'', description: '', quantity: 0, price: 0 },
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

  // STATE
  const [items, setItems] = useState(existingInvoice?.items || defaultItems);
  const [transportItems, setTransportItems] = useState(existingInvoice?.transportItems || []);
  const [preGstDeductions, setPreGstDeductions] = useState(existingInvoice?.preGstDeductions || []);
  const [postGstDeductions, setPostGstDeductions] = useState(existingInvoice?.postGstDeductions || []);

  const [invoiceType, setInvoiceType] = useState(existingInvoice?.invoiceType || 'Container');
  const [includeGST, setIncludeGST] = useState(existingInvoice?.includeGST ?? true);
  const [showTransport, setShowTransport] = useState(existingInvoice?.showTransport ?? false);

  // ITEM HANDLERS
  const handleItemChange = (key, field, value) => setItems(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));
  const addRow = () => setItems(prev => [...prev, { key: uid(), description: '', quantity: 0, price: 0 }]);
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

  // RETURN API
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