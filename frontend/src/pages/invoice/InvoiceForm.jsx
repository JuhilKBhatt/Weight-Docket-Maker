// ./frontend/src/pages/InvoiceForm.jsx

import axios from 'axios';
import React, { useEffect } from 'react';
import { Form, Input, Button, Typography, Checkbox, Row, Col } from 'antd';

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

  useEffect(() => {
    async function loadSelectors() {
      //const data = await selectorData();
      const data = {
      companies_from: [
        {
          name: "ABC Metals",
          phone: "123456789",
          email: "abc@metals.com",
          abn: "111222333",
          address: "1 Main St, Sydney"
        },
        {
          name: "XYZ Industries",
          phone: "987654321",
          email: "xyz@industries.com",
          abn: "444555666",
          address: "99 Industrial Rd, Melbourne"
        }
      ],
      companies_to: [
        {
          name: "Client Co",
          phone: "555666777",
          email: "contact@clientco.com",
          abn: "777888999",
          address: "10 Client Ave, Brisbane"
        }
      ],
      accounts: [
        {
          bank_name: "Commonwealth Bank",
          account_name: "ABC Metals Pty Ltd",
          bsb: "062-000",
          account_number: "12345678"
        },
        {
          bank_name: "ANZ Bank",
          account_name: "XYZ Industries",
          bsb: "012-345",
          account_number: "87654321"
        }
      ]
    };
      setSavedCompaniesFrom(data.companies_from);
      setSavedCompaniesTo(data.companies_to);
      setSavedAccounts(data.accounts);
    }

    loadSelectors();
  }, []);

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
        <Form form={form} layout="vertical">
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
              <Form.Item label="Notes"><Input.TextArea rows={4} /></Form.Item>
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