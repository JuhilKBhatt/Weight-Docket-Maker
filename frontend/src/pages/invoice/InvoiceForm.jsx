// ./frontend/src/pages/InvoiceForm.jsx

import axios from 'axios';
import React, { useEffect } from 'react';
import { Form, Input, Button, Typography, Checkbox, Row, Col } from 'antd';
import dayjs from 'dayjs';

// Styles
import '../../styles/InvoiceForm.css';

// Custom hooks and components
import useInvoiceForm from '../../hooks/invoice/useInvoiceForm';
import useInvoiceCalculations from '../../hooks/invoice/useInvoiceCalculations';
import BillingInfo from '../../components/invoice/BillingInfo';
import InvoiceItemsTable from '../../components/invoice/InvoiceItemsTable';
import TransportTable from '../../components/invoice/TransportTable';
import InvoiceTotalsSummary from '../../components/invoice/InvoiceTotalsSummary';
import PayAccountSection from '../../components/invoice/PayAccountSection';
import { useConfirmReset } from '../../scripts/utilities/confirmReset';
import { saveInvoice, selectorData } from '../../scripts/utilities/invoiceUtils';

export default function InvoiceForm({mode = 'new', existingInvoice = null}) {
  const [form] = Form.useForm();
  const [savedCompaniesFrom, setSavedCompaniesFrom] = React.useState([]);
  const [savedCompaniesTo, setSavedCompaniesTo] = React.useState([]);
  const [savedAccounts, setSavedAccounts] = React.useState([]);

  const confirmReset = useConfirmReset();
  
  const invoice = useInvoiceForm(mode, existingInvoice);
  const {
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
    setShowTransport,
    handleItemChange,
    handleTransportChange,
    handleDeductionChange,
    addRow,
    removeRow,
    addDeduction,
    removeDeduction,
  } = invoice;
  const calculatedTotals = useInvoiceCalculations(invoice);
  const dateFormat = 'DD/MM/YYYY';

  // 1. Load Selector Data (Companies/Accounts)
  useEffect(() => {
    async function loadSelectors() {
      try {
        const data = await selectorData();
        // Ensure we handle potential null/undefined returns safely
        setSavedCompaniesFrom(data.companies_from || []);
        setSavedCompaniesTo(data.companies_to || []);
        setSavedAccounts(data.accounts || []);
      } catch (err) {
        console.error("Failed to load selector data", err);
      }
    }

    loadSelectors();
  }, []);

  // 2. Auto-Fill Selectors in Edit Mode
  // This effect runs when existingInvoice exists and the selector lists are populated.
  // It finds the matching index for companies/accounts and sets the dropdown value.
  useEffect(() => {
    if (mode === 'edit' && existingInvoice) {
      const updates = {};

      // Match 'Bill From' Company
      if (savedCompaniesFrom.length > 0 && existingInvoice.bill_from_name) {
        const fromIdx = savedCompaniesFrom.findIndex(c => c.name === existingInvoice.bill_from_name);
        if (fromIdx !== -1) {
          updates.fromSavedCompany = fromIdx;
        }
      }

      // Match 'Bill To' Company
      if (savedCompaniesTo.length > 0 && existingInvoice.bill_to_name) {
        const toIdx = savedCompaniesTo.findIndex(c => c.name === existingInvoice.bill_to_name);
        if (toIdx !== -1) {
          updates.toSavedCompany = toIdx;
        }
      }

      // Match 'Pay To' Account
      // We match strictly on Bank Name AND Account Name to ensure accuracy
      if (savedAccounts.length > 0 && existingInvoice.account_name) {
        const accIdx = savedAccounts.findIndex(a => 
          a.account_name === existingInvoice.account_name && 
          a.bank_name === existingInvoice.bank_name
        );
        if (accIdx !== -1) {
          updates.savedAccount = accIdx;
        }
      }

      // Apply updates if any matches were found
      if (Object.keys(updates).length > 0) {
        form.setFieldsValue(updates);
      }
    }
  }, [mode, existingInvoice, savedCompaniesFrom, savedCompaniesTo, savedAccounts, form]);

  const handleSaveSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        scrinvID,
        invoiceType,
        includeGST,
        showTransport,
        items,
        transportItems,
        preGstDeductions,
        postGstDeductions,
        values,
      };
      await saveInvoice(payload);
      alert('Invoice saved successfully!');
      localStorage.removeItem("scrinvID");
      invoice.resetInvoice();
      form.resetFields();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice. Please try again.');
    }
  };

  return (
    <div className="home-container">
      <Typography.Title level={1}>
        {mode === 'new' ? 'Create New Invoice' : mode === 'edit' ? 'Edit Invoice' : 'View Invoice'}
      </Typography.Title>

      <div className="form-container">
        <Form
          form={form}
          layout="vertical"
          // Safe Initial Values Mapping
          initialValues={{
            // Merge existing invoice data
            ...existingInvoice,

            // IDs and Flags
            scrinvID: existingInvoice?.scrinv_number,
            invoiceType: existingInvoice?.invoice_type,
            notes: existingInvoice?.notes || "",
            includeGST: existingInvoice?.include_gst,
            showTransport: existingInvoice?.show_transport,

            // Date Handling
            date: existingInvoice?.invoice_date ? dayjs(existingInvoice.invoice_date) : dayjs(),

            // Bill From
            fromCompanyName: existingInvoice?.bill_from_name,
            fromCompanyPhone: existingInvoice?.bill_from_phone,
            fromCompanyEmail: existingInvoice?.bill_from_email,
            fromCompanyABN: existingInvoice?.bill_from_abn,
            fromCompanyAddress: existingInvoice?.bill_from_address,

            // Bill To
            toCompanyName: existingInvoice?.bill_to_name,
            toCompanyPhone: existingInvoice?.bill_to_phone,
            toCompanyEmail: existingInvoice?.bill_to_email,
            toCompanyABN: existingInvoice?.bill_to_abn,
            toCompanyAddress: existingInvoice?.bill_to_address,

            // Bank Details
            bankName: existingInvoice?.bank_name,
            accName: existingInvoice?.account_name,
            bsb: existingInvoice?.bsb,
            accountNumber: existingInvoice?.account_number
          }}
        >
          {/* Bill From, Bill To, and Invoice Details columns... */}
          <BillingInfo
            form={form}
            savedCompaniesFrom={savedCompaniesFrom}
            savedCompaniesTo={savedCompaniesTo}
            invoiceType={invoiceType}
            setInvoiceType={setInvoiceType}
            dateFormat={dateFormat}
            scrinvID={scrinvID}
          />

          {/* Invoice Items */}
          <InvoiceItemsTable
            invoiceType={invoiceType}
            items={calculatedTotals.itemsWithTotals}
            handleItemChange={handleItemChange}
            addRow={addRow}
            removeRow={removeRow}
          />

          {/* Transport Section */}
          <div style={{ marginTop: 20 }}>
            <Checkbox
              checked={showTransport}
              onChange={(e) => setShowTransport(e.target.checked)}
            >
              Add Transport
            </Checkbox>
          </div>

          {showTransport && (
            <TransportTable
              invoiceType={invoiceType}
              transportItems={transportItems}
              handleTransportChange={handleTransportChange}
            />
          )}

          {/* Totals, Deductions, Notes */}
          <Row gutter={24} style={{ marginTop: 20 }}>
            <Col span={12}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
            <InvoiceTotalsSummary
              includeGST={includeGST}
              setIncludeGST={setIncludeGST}
              calculatedTotals={calculatedTotals}
              preGstDeductions={preGstDeductions}
              postGstDeductions={postGstDeductions}
              handleDeductionChange={handleDeductionChange}
              addDeduction={addDeduction}
              removeDeduction={removeDeduction}
            />
          </Row>

          {/* Pay To Section */}
          <PayAccountSection
            form={form}
            savedAccounts={savedAccounts}
          />

          {/* Submit & Reset Button */}
          <Row justify="end" style={{ marginTop: 30, gap: '50px' }}>
            <Button
              type="dashed"
              size='large'
              onClick={() =>
                confirmReset(() => {
                  invoice.resetInvoice(); // React state
                  form.resetFields();     // AntD fields
                })
              }
            >
              Reset Invoice
            </Button>
            <Button type="primary" size='large' onClick={handleSaveSubmit}>Save & Download Invoice</Button>
            <Button type='primary' size='large'>Save & Email Invoice</Button>
          </Row>
        </Form>
      </div>
    </div>
  )
}