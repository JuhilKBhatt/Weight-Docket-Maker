// ./frontend/src/hooks/invoice/useInvoiceForm.js

import { useState, useRef, useEffect } from 'react';
import invoiceNewSCRIDService from '../../services/invoiceService';

// Utility to generate stable keys
const uid = (() => {
  let id = 0;
  return () => ++id;
})();

export default function useInvoiceForm(isNewInvoice) {
  //DEFAULT STATE
  const defaultItems = [
    {
      key: uid(),
      description: '',
      quantity: 0,
      price: 0,
    },
  ];

  // SCRINV ID
  const [scrinvID, setScrinvID] = useState(null);
  useEffect(() => {
    if (isNewInvoice) {
      invoiceNewSCRIDService.createNewInvoice().then(id => {
        //setScrinvID(id);
        setScrinvID(1);
      });
    }
  }, [isNewInvoice]);

  // STATE
  const [items, setItems] = useState(defaultItems);
  const [transportItems, setTransportItems] = useState([]);
  const [preGstDeductions, setPreGstDeductions] = useState([]);
  const [postGstDeductions, setPostGstDeductions] = useState([]);

  const [invoiceType, setInvoiceType] = useState('Container');
  const [includeGST, setIncludeGST] = useState(true);
  const [showTransport, setShowTransport] = useState(false);

  // ITEM HANDLERS
  const handleItemChange = (key, field, value) => {
    setItems(prev =>
      prev.map(item =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  };

  const addRow = () => {
    setItems(prev => [
      ...prev,
      {
        key: uid(),
        description: '',
        quantity: 0,
        price: 0,
      },
    ]);
  };

  const removeRow = key => {
    setItems(prev => prev.filter(item => item.key !== key));
  };

  // TRANSPORT HANDLERS
  const handleTransportChange = (key, field, value) => {
    setTransportItems(prev =>
      prev.map(item =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  };

  // DEDUCTIONS
  const addDeduction = type => {
    const deduction = {
      key: uid(),
      label: '',
      amount: 0,
    };

    if (type === 'pre') {
      setPreGstDeductions(prev => [...prev, deduction]);
    } else {
      setPostGstDeductions(prev => [...prev, deduction]);
    }
  };

  const removeDeduction = (type, key) => {
    if (type === 'pre') {
      setPreGstDeductions(prev => prev.filter(d => d.key !== key));
    } else {
      setPostGstDeductions(prev => prev.filter(d => d.key !== key));
    }
  };

  const handleDeductionChange = (type, key, field, value) => {
    const setter =
      type === 'pre' ? setPreGstDeductions : setPostGstDeductions;

    setter(prev =>
      prev.map(d =>
        d.key === key ? { ...d, [field]: value } : d
      )
    );
  };

  // TRANSPORT TOGGLE EFFECT
  const toggleTransport = value => {
    setShowTransport(value);

    if (value && transportItems.length === 0) {
      setTransportItems([
        {
          key: uid(),
          name: invoiceType === 'Pickup' ? 'Pickup' : 'Container',
          NumOfCTR: 0,
          PricePreCTR: 0,
        },
        {
          key: uid(),
          name: 'Overweight',
          NumOfCTR: 0,
          PricePreCTR: 0,
        },
      ]);
    }

    if (!value) {
      setTransportItems([]);
    }
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