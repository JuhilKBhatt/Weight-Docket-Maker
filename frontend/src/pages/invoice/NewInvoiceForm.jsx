// ./frontend/src/pages/NewInvoiceForm.jsx

import axios from 'axios';
import { Form, Input, Button, Typography, Checkbox, Row, Col } from 'antd';
import '../../styles/InvoiceForm.css';
import useInvoiceForm from '../../hooks/invoice/useInvoiceForm';
import useInvoiceCalculations from '../../hooks/invoice/useInvoiceCalculations';
import BillingInfo from '../../components/invoice/BillingInfo';
import InvoiceItemsTable from '../../components/invoice/InvoiceItemsTable';
import TransportTable from '../../components/invoice/TransportTable';
import InvoiceTotalsSummary from '../../components/invoice/InvoiceTotalsSummary';
import PayAccountSection from '../../components/invoice/PayAccountSection';

export default function NewInvoiceForm() {
  const dateFormat = 'DD/MM/YYYY';
  const invoice = useInvoiceForm();

  const {
  items,
  transportItems,
  preGstDeductions,
  postGstDeductions,
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

  // --- REAL-TIME CALCULATIONS ---
  const calculatedTotals = useInvoiceCalculations(invoice);

const handleSubmit = async (values) => {
  try {
    const payload = {
      scrNumber: Number(values.scrNumber),
      date: values.date.format("YYYY-MM-DD"), // ensure it's a string in 'YYYY-MM-DD'
      invoiceType,
      includeGST,
      grossTotal: Number(calculatedTotals.grossTotal || 0),
      gstAmount: Number(calculatedTotals.gstAmount || 0),
      finalTotal: Number(calculatedTotals.finalTotal || 0),

      fromCompany: {
        name: values.fromCompanyName || "",
        phone: values.fromCompanyPhone || "",
        email: values.fromCompanyEmail || "",
        abn: values.fromCompanyABN || "",
        address: values.fromCompanyAddress || "",
      },
      toCompany: {
        name: values.toCompanyName || "",
        phone: values.toCompanyPhone || "",
        email: values.toCompanyEmail || "",
        abn: values.toCompanyABN || "",
        address: values.toCompanyAddress || "",
      },
      bankAccount: {
        accName: values.accName || "",
        bankName: values.bankName || "",
        bsb: values.bsb || "",
        accountNumber: values.accountNumber || "",
      },

      items: items.map(item => ({
        description: item.description || "",
        seal: item.seal || null,
        container: item.container || null,
        weight: item.weight ? Number(item.weight) : 0,
        price: item.price ? Number(item.price) : 0,
        total: item.total ? Number(item.total) : 0,
      })),

      transportItems: showTransport
        ? transportItems.map(t => ({
            name: t.name || "",
            NumOfCTR: t.NumOfCTR ? Number(t.NumOfCTR) : 0,
            PricePreCTR: t.PricePreCTR ? Number(t.PricePreCTR) : 0,
          }))
        : [],

      preGstDeductions: preGstDeductions.map(d => ({
        label: d.label || "",
        amount: d.amount ? Number(d.amount) : 0,
      })),

      postGstDeductions: postGstDeductions.map(d => ({
        label: d.label || "",
        amount: d.amount ? Number(d.amount) : 0,
      })),
    };

    const response = await axios.post("http://localhost:8000/invoice/create", payload);
    alert("✅ Invoice saved!");
    console.log(response.data);
  } catch (error) {
    console.error("❌ Failed to save invoice:", error.response?.data || error.message);
  }
};

  return (
    <div className="home-container">
      <Typography.Title level={1}>Create New Invoice</Typography.Title>
      <Typography.Paragraph>Use the form below to create a new invoice.</Typography.Paragraph>

      <div className="form-container">
        <Form layout="vertical" onFinish={handleSubmit}>
          {/* Bill From, Bill To, and Invoice Details columns... */}
          <BillingInfo
            invoiceType={invoiceType}
            setInvoiceType={setInvoiceType}
            dateFormat={dateFormat}
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
            <Col span={12}>
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
            </Col>
          </Row>

          {/* Pay To Section */}
          <PayAccountSection />

          {/* Submit & Reset Button */}
          <Row justify="end" style={{ marginTop: 30 }}>
            <Button type="dashed" htmlType='reset' style={{ marginRight: 10 }}>Reset Invoice</Button>
            <Button type="primary" size='large' htmlType="submit">Send Invoice</Button>
          </Row>
        </Form>
      </div>
    </div>
  )
}