// ./frontend/src/pages/InvoiceForm.jsx

import React from 'react';
import { Form, Button, Typography, Checkbox, Row, Col, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import '../../styles/Form.css';

// Hooks
import useInvoiceForm from '../../hooks/invoice/useInvoiceForm';
import useInvoiceCalculations from '../../hooks/invoice/useInvoiceCalculations';
import useInvoiceSelectors from '../../hooks/invoice/useInvoiceSelectors';
import useInvoiceAutoFill from '../../hooks/invoice/useInvoiceAutoFill';
import { useConfirmReset } from '../../scripts/utilities/confirmReset';

// Utilities
import { saveDraftInvoice, DownloadPDFInvoice } from '../../scripts/utilities/invoiceUtils';
import { getInitialValues } from '../../scripts/utilities/invoiceFormHelpers';

// Components
import BillingInfo from '../../components/invoice/BillingInfo';
import InvoiceItemsTable from '../../components/invoice/InvoiceItemsTable';
import TransportTable from '../../components/invoice/TransportTable';
import TotalsSummary from '../../components/TotalsSummary';
import PayAccountSection from '../../components/invoice/PayAccountSection';

export default function InvoiceForm({ mode = 'new', existingInvoice = null }) {
  const [form] = Form.useForm();
  const Navigate = useNavigate();
  const confirmReset = useConfirmReset();
  
  // 1. Initialize State & Selectors
  const { currency, setCurrency, ...invoice} = useInvoiceForm(mode, existingInvoice);
  const calculatedTotals = useInvoiceCalculations(invoice);
  const { savedCompaniesFrom, savedCompaniesTo, savedAccounts } = useInvoiceSelectors();

  // 2. Handle Auto-Fill for Edit Mode
  useInvoiceAutoFill({
    form,
    mode,
    existingInvoice,
    savedCompaniesFrom,
    savedCompaniesTo,
    savedAccounts
  });

  const handleSaveDraftSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...invoice, // Spread hooks state (scrinvID, items, transportItems, etc.)
        currency,
        values,
      };
      
      await saveDraftInvoice(payload);
      alert('Invoice saved successfully!');
      
      sessionStorage.removeItem("scrinvID");

      if (mode === 'new'){
        invoice.resetInvoice();
        form.resetFields();
        Navigate('/InvoiceHome');
      }else if (mode === 'edit') {
        Navigate('/view-invoice');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice. Please try again.');
    }
  };

  const handleSaveDownloadSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...invoice, // Spread hooks state (scrinvID, items, transportItems, etc.)
        currency,
        values,
        status: 'Downloaded',
      };
      
      const savedData = await saveDraftInvoice(payload);
      await DownloadPDFInvoice(savedData.id, payload.scrinvID);
      alert('Invoice saved and download initiated!');
      
      sessionStorage.removeItem("scrinvID");
      if (mode === 'new'){
        invoice.resetInvoice();
        form.resetFields();
        Navigate('/InvoiceHome');
      }else if (mode === 'edit') {
        Navigate('/view-invoice');
      }
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
          initialValues={getInitialValues(existingInvoice)}
        >
          {/* Section 1: Billing Details */}
          <BillingInfo
            form={form}
            savedCompaniesFrom={savedCompaniesFrom}
            savedCompaniesTo={savedCompaniesTo}
            invoiceType={invoice.invoiceType}
            setInvoiceType={invoice.setInvoiceType}
            dateFormat="DD/MM/YYYY"
            scrinvID={invoice.scrinvID}
          />

          {/* Section 2: Items Table */}
          <InvoiceItemsTable
            invoiceType={invoice.invoiceType}
            items={calculatedTotals.itemsWithTotals}
            handleItemChange={invoice.handleItemChange}
            addRow={invoice.addRow}
            removeRow={invoice.removeRow}
            currency={currency}
            setCurrency={setCurrency}
          />

          {/* Section 3: Transport */}
          <div style={{ marginTop: 20 }}>
            <Checkbox
              checked={invoice.showTransport}
              onChange={(e) => invoice.setShowTransport(e.target.checked)}
            >
              Add Transport
            </Checkbox>
          </div>

          {invoice.showTransport && (
            <TransportTable
              invoiceType={invoice.invoiceType}
              transportItems={invoice.transportItems}
              handleTransportChange={invoice.handleTransportChange}
              currency={currency}
              setCurrency={setCurrency}
            />
          )}

          {/* Section 4: Totals & Deductions */}
          <Row gutter={24} style={{ marginTop: 20 }}>
            <Col span={12}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={4} maxLength={280}/>
              </Form.Item>
            </Col>
            <TotalsSummary
              includeGST={invoice.includeGST}
              setIncludeGST={invoice.setIncludeGST}
              gstPercentage={invoice.gstPercentage}
              setGstPercentage={invoice.setGstPercentage}
              calculatedTotals={calculatedTotals}
              preGstDeductions={invoice.preGstDeductions}
              postGstDeductions={invoice.postGstDeductions}
              handleDeductionChange={invoice.handleDeductionChange}
              addDeduction={invoice.addDeduction}
              removeDeduction={invoice.removeDeduction}
              currency={currency}
              setCurrency={setCurrency}
            />
          </Row>

          {/* Section 5: Pay To */}
          <PayAccountSection
            form={form}
            savedAccounts={savedAccounts}
          />

          {/* Actions */}
          <Row justify="end" style={{ marginTop: 30, gap: '50px' }}>
            <Button
              type="dashed"
              size='large'
              onClick={() => confirmReset(() => {
                  invoice.resetInvoice();
                  form.resetFields();
                  window.location.reload();
              })}
            >
              Reset Invoice
            </Button>
            <Button size='large' onClick={handleSaveDraftSubmit}>
              Save Draft
            </Button>
            <Button type="primary" size='large' onClick={handleSaveDownloadSubmit}>
              Download Invoice
            </Button>
            <Button type='primary' size='large' disabled >
              Email Invoice
            </Button>
          </Row>
        </Form>
      </div>
    </div>
  );
}