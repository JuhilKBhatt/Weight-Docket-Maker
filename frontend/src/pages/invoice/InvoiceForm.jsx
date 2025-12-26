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
import { use } from 'react';

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
    async function loadCompanies() {
      // Mock data for saved companies and accounts

      //setSavedCompaniesFrom(mock);
      //setSavedCompaniesTo(mock);
      //setSavedAccounts(mockAccounts);
    }

    loadCompanies();
  }, []);

  const handleSubmit = async (values) => {
  const payload = {
    scrinv_number: scrinvID,
    invoice_type: invoiceType,
    include_gst: includeGST,
    show_transport: showTransport,
    notes: values.notes || "",

    bill_from_name: values.bill_from_name,
    bill_from_abn: values.bill_from_abn,
    bill_from_address: values.bill_from_address,

    bill_to_name: values.bill_to_name,
    bill_to_abn: values.bill_to_abn,
    bill_to_address: values.bill_to_address,

    bank_name: values.bank_name,
    account_name: values.account_name,
    bsb: values.bsb,
    account_number: values.account_number,

    items: items.map(i => ({
      description: i.description,
      quantity: Number(i.quantity),
      price: Number(i.price)
    })),

    transport_items: transportItems.map(t => ({
      name: t.name,
      num_of_ctr: Number(t.NumOfCTR),
      price_per_ctr: Number(t.PricePreCTR)
    })),

    deductions: [
      ...preGstDeductions.map(d => ({
        type: "pre",
        label: d.label,
        amount: Number(d.amount)
      })),
      ...postGstDeductions.map(d => ({
        type: "post",
        label: d.label,
        amount: Number(d.amount)
      })),
    ]
  };

  try {
    await axios.post("http://localhost:8000/invoices", payload);
    alert("Invoice saved!");
    invoice.resetInvoice();
    form.resetFields();
  } catch (err) {
    console.error(err);
    alert("Failed to save invoice");
  }
};

  return (
    <div className="home-container">
      <Typography.Title level={1}>
        {mode === 'new' ? 'Create New Invoice' : mode === 'edit' ? 'Edit Invoice' : 'View Invoice'}
      </Typography.Title>

      <div className="form-container">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
          <Row justify="end" style={{ marginTop: 30 }}>
            <Button
              type="dashed"
              style={{ marginRight: 10 }}
              onClick={() =>
                confirmReset(() => {
                  invoice.resetInvoice(); // React state
                  form.resetFields();     // AntD fields
                })
              }
            >
              Reset Invoice
            </Button>
            <Button type="primary" size='large' htmlType="submit">Send Invoice</Button>
          </Row>
        </Form>
      </div>
    </div>
  )
}