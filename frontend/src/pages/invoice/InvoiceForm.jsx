// src/pages/invoice/InvoiceForm.jsx

import React, { useEffect, useState } from 'react';
import { Form, Button, Typography, Checkbox, Row, Col, Input, App, Modal, Spin, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FullscreenOutlined } from '@ant-design/icons';
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

// Services
import { getDefaults, getCurrencies, getUnits } from '../../services/settingsService';
import invoiceService from '../../services/invoiceService';

// Components
import BillingInfo from '../../components/invoice/BillingInfo';
import InvoiceItemsTable from '../../components/invoice/InvoiceItemsTable';
import TransportTable from '../../components/invoice/TransportTable';
import TotalsSummary from '../../components/TotalsSummary';
import PayAccountSection from '../../components/invoice/PayAccountSection';

export default function InvoiceForm({ mode = 'new', existingInvoice = null }) {
  const { message } = App.useApp();
  
  const [form] = Form.useForm();
  const Navigate = useNavigate();
  const confirmReset = useConfirmReset();
  
  // 1. Initialize State & Selectors
  const { currency, setCurrency, setDefaultUnit, ...invoice} = useInvoiceForm(mode, existingInvoice);
  const calculatedTotals = useInvoiceCalculations(invoice);
  const { savedCompaniesFrom, savedCompaniesTo, savedAccounts } = useInvoiceSelectors();

  // Local state for options
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);

  // --- EMAIL MODAL STATE ---
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailForm] = Form.useForm();
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  // --- FETCH SETTINGS & DEFAULTS ---
  useEffect(() => {
    async function loadSettings() {
      try {
        const [defaults, curs, units] = await Promise.all([
          getDefaults(),
          getCurrencies(),
          getUnits()
        ]);
        
        setCurrencyOptions(curs);
        setUnitOptions(units);

        // Apply Defaults ONLY if New Mode
        if (mode === 'new') {
          if (defaults.default_currency) setCurrency(defaults.default_currency);
          if (defaults.default_unit) setDefaultUnit(defaults.default_unit);
          
          // USE INVOICE-SPECIFIC GST SETTING
          if (defaults.default_invoice_gst_enabled) {
              invoice.setIncludeGST(defaults.default_invoice_gst_enabled === 'true');
          }
          
          if (defaults.default_gst_percentage) invoice.setGstPercentage(Number(defaults.default_gst_percentage));
          if (defaults.default_invoice_type) invoice.setInvoiceType(defaults.default_invoice_type);
          
          // Apply Default Entities
          const defaultBillFromId = Number(defaults.default_bill_from);
          const defaultAccountId = Number(defaults.default_account);

          if (defaultBillFromId && savedCompaniesFrom.length > 0) {
              const match = savedCompaniesFrom.find(c => c.id === defaultBillFromId);
              if (match) {
                  form.setFieldsValue({
                      fromSavedCompany: savedCompaniesFrom.indexOf(match),
                      fromCompanyName: match.name,
                      fromCompanyPhone: match.phone,
                      fromCompanyEmail: match.email,
                      fromCompanyABN: match.abn,
                      fromCompanyAddress: match.address,
                  });
              }
          }

          if (defaultAccountId && savedAccounts.length > 0) {
              const match = savedAccounts.find(a => a.id === defaultAccountId);
              if (match) {
                  form.setFieldsValue({
                    savedAccount: savedAccounts.indexOf(match),
                    accName: match.account_name,
                    bankName: match.bank_name,
                    bsb: match.bsb,
                    accountNumber: match.account_number,
                  });
              }
          }
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    }
    
    if (savedCompaniesFrom.length > 0 || mode === 'new') { 
        loadSettings();
    }
  }, [mode, savedCompaniesFrom, savedAccounts]); 

  // 2. Handle Auto-Fill for Edit Mode
  useInvoiceAutoFill({
    form,
    mode,
    existingInvoice,
    savedCompaniesFrom,
    savedCompaniesTo,
    savedAccounts
  });

  // --- SAVE HANDLER ---
  const handleSaveDraftSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...invoice, 
        currency,
        values,
      };
      
      const saved = await saveDraftInvoice(payload);
      message.success('Invoice saved successfully!');
      
      sessionStorage.removeItem("scrinvID");
      return saved; 
    } catch (error) {
      console.error('Error saving invoice:', error);
      message.error('Failed to save invoice. Please try again.');
      throw error;
    }
  };

  const handleSaveDownloadSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...invoice, 
        currency,
        values,
        status: 'Downloaded',
      };
      
      const savedData = await saveDraftInvoice(payload);
      await DownloadPDFInvoice(savedData.id, payload.scrinvID);
      message.success('Invoice saved and download initiated!');
      
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
      message.error('Failed to save invoice. Please try again.');
    }
  };

  // --- EMAIL HANDLERS ---
  const openEmailModal = async () => {
      try {
          message.loading({ content: 'Preparing email preview...', key: 'emailPrep' });
          
          await form.validateFields();
          
          const savedInvoice = await handleSaveDraftSubmit();
          if (!savedInvoice || !savedInvoice.id) throw new Error("Save failed");

          const invID = savedInvoice.scrinv_number || 'DRAFT';

          // Get PDF Blob
          const pdfResponse = await axios.get(`http://localhost:8000/api/invoices/${savedInvoice.id}/download`, {
              responseType: 'blob',
          });
          const pdfUrl = window.URL.createObjectURL(new Blob([pdfResponse.data], { type: 'application/pdf' }));
          setPdfPreviewUrl(pdfUrl);

          // Get Defaults & Form Values
          const defaults = await getDefaults();
          const formValues = form.getFieldsValue();
          
          // Template Replacements
          let subject = defaults.email_default_subject || `Invoice {{number}}`;
          
          // ADDED: Prepend Revised if in Edit Mode
          if (mode === 'edit') {
              subject = `Revised: ${subject}`;
          }

          let body = defaults.email_default_body || `Please find attached Invoice {{number}}.`;
          
          const replacements = {
              '{{number}}': invID,
              '{{company_name}}': formValues.fromCompanyName || '',
              '{{company_address}}': formValues.fromCompanyAddress || '',
              '{{company_abn}}': formValues.fromCompanyABN || '',
              '{{company_phone}}': formValues.fromCompanyPhone || '',
              '{{company_email}}': formValues.fromCompanyEmail || '',
          };

          Object.entries(replacements).forEach(([key, val]) => {
             const regex = new RegExp(key, 'g');
             subject = subject.replace(regex, val);
             body = body.replace(regex, val);
          });

          // --- SPLIT EMAILS FOR TO / CC ---
          const rawEmails = form.getFieldValue('toCompanyEmail') || '';
          // Split by comma, trim spaces, remove empty strings
          const emailList = rawEmails.split(',').map(e => e.trim()).filter(e => e);
          
          const primaryRecipient = emailList.length > 0 ? emailList[0] : '';
          const ccRecipients = emailList.length > 1 ? emailList.slice(1).join(', ') : '';

          emailForm.setFieldsValue({
              recipient: primaryRecipient,
              cc: ccRecipients,
              subject: subject,
              body: body
          });
          
          message.success({ content: 'Ready!', key: 'emailPrep', duration: 1 });
          setIsEmailModalOpen(true);

      } catch (err) {
          console.error(err);
          message.error({ content: "Failed to prepare email.", key: 'emailPrep' });
      }
  };

  const handleSendEmail = async () => {
      try {
          setEmailLoading(true);
          const emailValues = await emailForm.validateFields();
          
          const savedInvoice = await handleSaveDraftSubmit();

          const result = await invoiceService.sendInvoiceEmail(savedInvoice.id, emailValues);
          
          if (result.success) {
              message.success(result.message);
              setIsEmailModalOpen(false);
              setPdfPreviewUrl(null); 
              if (mode === 'new') {
                  invoice.resetInvoice();
                  form.resetFields();
                  Navigate('/InvoiceHome');
              } else {
                  Navigate('/view-invoice');
              }
          } else {
              message.error(`Email Failed: ${result.message}`);
          }

      } catch (err) {
          console.error("Email Process Failed", err);
          message.error("Failed to process email request.");
      } finally {
          setEmailLoading(false);
      }
  };

  useEffect(() => {
      return () => {
          if (pdfPreviewUrl) window.URL.revokeObjectURL(pdfPreviewUrl);
      };
  }, [pdfPreviewUrl]);

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
          <BillingInfo
            form={form}
            savedCompaniesFrom={savedCompaniesFrom}
            savedCompaniesTo={savedCompaniesTo}
            invoiceType={invoice.invoiceType}
            setInvoiceType={invoice.setInvoiceType}
            dateFormat="DD/MM/YYYY"
            scrinvID={invoice.scrinvID}
          />

          <InvoiceItemsTable
            invoiceType={invoice.invoiceType}
            items={calculatedTotals.itemsWithTotals}
            handleItemChange={invoice.handleItemChange}
            addRow={invoice.addRow}
            removeRow={invoice.removeRow}
            currency={currency}
            setCurrency={setCurrency}
            currencyOptions={currencyOptions}
            unitOptions={unitOptions}
          />

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
              currencyOptions={currencyOptions} // Added prop
            />
          )}

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

          <PayAccountSection
            form={form}
            savedAccounts={savedAccounts}
          />

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
            <Button size='large' onClick={async () => {
                await handleSaveDraftSubmit();
                if (mode === 'new') {
                    invoice.resetInvoice();
                    form.resetFields();
                    Navigate('/InvoiceHome');
                } else {
                    Navigate('/view-invoice');
                }
            }}>
              Save Draft
            </Button>
            <Button type="primary" size='large' onClick={handleSaveDownloadSubmit}>
              Download Invoice
            </Button>
            <Button type='primary' size='large' onClick={openEmailModal}>
              Email Invoice
            </Button>
          </Row>
        </Form>
      </div>

      {/* --- EMAIL MODAL --- */}
      <Modal
        title="Email Invoice"
        open={isEmailModalOpen}
        onCancel={() => setIsEmailModalOpen(false)}
        onOk={handleSendEmail}
        confirmLoading={emailLoading}
        okText={emailLoading ? "Sending..." : "Send Email"}
        width={1000}
      >
          <Row gutter={24}>
              {/* LEFT: EMAIL FORM */}
              <Col span={10}>
                  <Form form={emailForm} layout="vertical">
                      <Form.Item name="recipient" label="Recipient (To)" rules={[{required: true, type: 'email', message: 'Please enter a valid email'}]}>
                          <Input placeholder="client@example.com" />
                      </Form.Item>
                      {/* ADDED CC FIELD */}
                      <Form.Item name="cc" label="CC">
                          <Input placeholder="boss@example.com, accounts@example.com" />
                      </Form.Item>
                      <Form.Item name="subject" label="Subject" rules={[{required: true, message: 'Subject is required'}]}>
                          <Input />
                      </Form.Item>
                      <Form.Item name="body" label="Message Body">
                          <Input.TextArea rows={12} />
                      </Form.Item>
                  </Form>
              </Col>

              {/* RIGHT: PDF PREVIEW */}
              <Col span={14}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Typography.Text strong>PDF Preview:</Typography.Text>
                      {pdfPreviewUrl && (
                          <Tooltip title="Open in new tab for full screen view">
                              <Button 
                                  type="link" 
                                  size="small" 
                                  icon={<FullscreenOutlined />}
                                  onClick={() => window.open(pdfPreviewUrl, '_blank')}
                              >
                                  Full View
                              </Button>
                          </Tooltip>
                      )}
                  </div>
                  
                  <div style={{ border: '1px solid #ccc', height: '450px', background: '#f0f0f0' }}>
                      {pdfPreviewUrl ? (
                          <iframe 
                              src={pdfPreviewUrl} 
                              width="100%" 
                              height="100%" 
                              style={{ border: 'none' }}
                              title="Invoice Preview"
                          />
                      ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                              <Spin tip="Generating PDF..." />
                          </div>
                      )}
                  </div>
              </Col>
          </Row>
      </Modal>
    </div>
  );
}