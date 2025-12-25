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
      const mock = [
        {
          id: 1,
          label: 'ABC Logistics Pty Ltd',
          phone: '0412345678',
          email: 'example@mail.com',
          abn: '12345678901',
          address: '123 Example St, Sydney NSW 2000'
        },
        {
          id: 2,
          label: 'XYZ Transport Services',
          phone: '0498765432',
          email: 'transport@hotmail.com',
          abn: '10987654321',
          address: '456 Sample Rd, Melbourne VIC 3000'
        }
      ];
      setSavedCompaniesFrom(mock);
      setSavedCompaniesTo(mock);

      const mockAccounts = [
        {
          id: 1,
          label: 'Business Account - Bank A',
          accName: 'ABC Logistics Pty Ltd',
          bankName: 'Bank A',
          bsb: '123456',
          accountNumber: '12345678',
        },
        {
          id: 2,
          label: 'Business Account - Bank B',
          accName: 'XYZ Transport Services',
          bankName: 'Bank B',
          bsb: '654321',
          accountNumber: '87654321',
        }
      ];
      setSavedAccounts(mockAccounts);
    }

    loadCompanies();
  }, []);

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