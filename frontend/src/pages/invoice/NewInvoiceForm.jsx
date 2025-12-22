// ./frontend/src/pages/NewInvoiceForm.jsx

import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { Form, Input, InputNumber, Select, DatePicker, Button, Table, Typography, Checkbox, Row, Col, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import '../../styles/InvoiceForm.css';
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';
import useInvoiceForm from '../../hooks/invoice/useInvoiceForm';
import useInvoiceCalculations from '../../hooks/invoice/useInvoiceCalculations';

export default function NewInvoiceForm() {

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

  // Date format for DatePicker
  const dateFormat = 'DD/MM/YYYY';

  // --- REAL-TIME CALCULATIONS ---
  const calculatedTotals = useInvoiceCalculations(invoice);

  // --- DYNAMIC TABLE COLUMNS ---
  const sharedColumns = [
    { title: 'Description', dataIndex: 'description', render: (_, record) => <Input value={record.description} onChange={(e) => handleItemChange(record.key, 'description', e.target.value)} /> },
    { title: 'Net Weight (in tonne)', dataIndex: 'weight', render: (_, record) => <InputNumber addonAfter="t" style={{ width: '100%' }} value={record.weight} onChange={(val) => handleItemChange(record.key, 'weight', val)} /> },
    { title: '$AUD/tonne', dataIndex: 'price', render: (_, record) => <InputNumber addonBefore="$" style={{ width: '100%' }} value={record.price} formatter={audFormatter} parser={audParser} onChange={(val) => handleItemChange(record.key, 'price', val)} /> },
    { title: 'Total', dataIndex: 'total', render: (_, record) => <InputNumber addonBefore="$" style={{ width: '100%' }} value={record.total} formatter={audFormatterFixed} parser={audParser} precision={2} disabled /> },
    { title: '', dataIndex: 'actions', render: (_, record) => <Popconfirm title="Remove row?" onConfirm={() => removeRow(record.key)}><Button danger type="link">X</Button></Popconfirm> }
  ];

  const containerColumns = [
    { title: 'Seal #', dataIndex: 'seal', render: (_, record) => <Input value={record.seal} onChange={(e) => handleItemChange(record.key, 'seal', e.target.value)} /> },
    { title: 'Container #', dataIndex: 'container', render: (_, record) => <Input value={record.container} onChange={(e) => handleItemChange(record.key, 'container', e.target.value)} /> },
    ...sharedColumns
  ];

  const pickupColumns = [
    { title: '#', dataIndex: 'seal', render: (_, record) => <Input value={record.seal} onChange={(e) => handleItemChange(record.key, 'seal', e.target.value)} /> },
    { title: 'Metal', dataIndex: 'container', render: (_, record) => <Input value={record.container} onChange={(e) => handleItemChange(record.key, 'container', e.target.value)} /> },
    ...sharedColumns
  ];

  const transportColumns = [
    { title: 'Item', dataIndex: 'name' },
    { title: 'Number of CTRs', dataIndex: 'NumOfCTR', render: (_, record) => <InputNumber addonAfter="CTR" style={{ width: '100%' }} value={record.NumOfCTR} onChange={(val) => handleTransportChange(record.key, 'NumOfCTR', val)} /> },
    { title: 'Price/CTR', dataIndex: 'PricePreCTR', render: (_, record) => <InputNumber addonBefore="$" style={{ width: '100%' }} value={record.PricePreCTR} formatter={audFormatter} parser={audParser} onChange={(val) => handleTransportChange(record.key, 'PricePreCTR', val)} /> }
  ];

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
          {/* Top Section */}
          <Row gutter={24}>
            {/* Bill From, Bill To, and Invoice Details columns... */}
            <Col span={8}>
              <Typography.Title level={4} style={{ backgroundColor: '#2c2c2cff', color:'#ffffff', padding: '10px'}} >Bill From:
                <Select style={{marginLeft: 10}}  defaultValue="" options={[{ }]} allowClear placeholder="New Company" />
              </Typography.Title>
              <Form.Item label="Company Name" name="fromCompanyName"><Input /></Form.Item>
              <Form.Item label="Phone" name="fromCompanyPhone"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Email" name="fromCompanyEmail"><Input /></Form.Item>
              <Form.Item label="ABN" name="fromCompanyABN"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Address" name="fromCompanyAddress"><Input /></Form.Item>
            </Col>

            <Col span={8}>
              <Typography.Title level={4} style={{ backgroundColor: '#2c2c2cff', color:'#ffffff', padding: '10px'}} >Bill To:
                <Select style={{marginLeft: 10}} options={[{ }]} allowClear placeholder="New Company" />
              </Typography.Title>
              <Form.Item label="Company Name" name="toCompanyName"><Input /></Form.Item>
              <Form.Item label="Phone" name="toCompanyPhone"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Email" name="toCompanyEmail"><Input /></Form.Item>
              <Form.Item label="ABN" name="toCompanyABN"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Address" name="toCompanyAddress"><Input /></Form.Item>
            </Col>

            <Col span={8}>
              <Typography.Title level={4} style={{ backgroundColor: '#2c2c2cff', color:'#ffffff', padding: '10px'}} >SCR No.:
                <InputNumber style={{marginLeft: 10}} disabled />
              </Typography.Title>
              <Form.Item label="Date" name="date" initialValue={dayjs()}>
                <DatePicker format={dateFormat} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Invoice Type">
                <Select value={invoiceType} onChange={setInvoiceType} options={[{ value: 'Container', label: 'Container' }, { value: 'Pickup', label: 'Pickup / Drop Off' }]} />
              </Form.Item>
            </Col>
          </Row>

          {/* Invoice Items */}
          <Typography.Title level={5}>Invoice Items</Typography.Title>
          <Table
            columns={invoiceType === 'Container' ? containerColumns : pickupColumns}
            dataSource={calculatedTotals.itemsWithTotals}
            pagination={false}
            bordered
          />
          <Button type="dashed" onClick={addRow} style={{ marginTop: 10 }}>+ Add Row</Button>

          {/* Transport Section */}
          <div style={{ marginTop: 20 }}>
            <Checkbox checked={showTransport} onChange={(e) => setShowTransport(e.target.checked)}>Add Transport</Checkbox>
          </div>
          {showTransport && (
            <div style={{ marginTop: 10 }}>
              <Typography.Title level={5}>Transport Charges</Typography.Title>
              <Table columns={transportColumns} dataSource={transportItems} pagination={false} bordered />
            </div>
          )}

          {/* Totals, Deductions, Notes */}
          <Row gutter={24} style={{ marginTop: 20 }}>
            <Col span={12}>
              <Form.Item label="Notes"><Input.TextArea rows={4} /></Form.Item>
            </Col>
            <Col span={12}>
              {/* Pre-GST deductions */}
              <Typography.Title level={5}>Deductions (Before GST)</Typography.Title>
              {preGstDeductions.map(d => (
                <Row gutter={10} key={d.key} style={{ marginBottom: 5 }}>
                  <Col span={12}><Input placeholder="Reason" value={d.label} onChange={(e) => handleDeductionChange('pre', d.key, 'label', e.target.value)} /></Col>
                  <Col span={8}><InputNumber addonBefore="$" placeholder="Amount" style={{ width: '100%' }} value={d.amount} formatter={audFormatter} parser={audParser} onChange={(val) => handleDeductionChange('pre', d.key, 'amount', val)} /></Col>
                  <Col span={4}><Button danger type="link" onClick={() => removeDeduction('pre', d.key)}>X</Button></Col>
                </Row>
              ))}
              <Button type="dashed" size="small" onClick={() => addDeduction('pre')}>+ Add Deduction</Button>

              {/* Subtotal & GST */}
              <Form.Item label={includeGST ? "Sub-Total" : "Total"} style={{ marginTop: 20 }}>
                <InputNumber addonBefore="$" disabled style={{ width: '100%' }} value={includeGST ? calculatedTotals.grossTotal : calculatedTotals.finalTotal} formatter={audFormatterFixed} parser={audParser} precision={2} />
              </Form.Item>

              <Row gutter={10} align="middle">
                <Col flex="none"><Checkbox checked={includeGST} onChange={(e) => setIncludeGST(e.target.checked)}>GST (10%)</Checkbox></Col>
                <Col flex="auto">{includeGST && <InputNumber addonBefore="$" disabled style={{ width: '100%' }} value={calculatedTotals.gstAmount} formatter={audFormatterFixed} parser={audParser} precision={2} />}</Col>
              </Row>

              {/* Post-GST deductions + Final Total */}
              {includeGST && (
                <>
                  <Typography.Title level={5} style={{ marginTop: 20 }}>Deductions (After GST)</Typography.Title>
                  {postGstDeductions.map(d => (
                     <Row gutter={10} key={d.key} style={{ marginBottom: 5 }}>
                      <Col span={12}><Input placeholder="Reason" value={d.label} onChange={(e) => handleDeductionChange('post', d.key, 'label', e.target.value)} /></Col>
                      <Col span={8}><InputNumber addonBefore="$" placeholder="Amount" style={{ width: '100%' }} value={d.amount} formatter={audFormatter} parser={audParser} onChange={(val) => handleDeductionChange('post', d.key, 'amount', val)} /></Col>
                      <Col span={4}><Button danger type="link" onClick={() => removeDeduction('post', d.key)}>X</Button></Col>
                    </Row>
                  ))}
                  <Button type="dashed" size="small" onClick={() => addDeduction('post')}>+ Add Deduction</Button>
                  <Form.Item label="Total" style={{ marginTop: 20, fontWeight: 'bold' }}>
                    <InputNumber addonBefore="$" disabled style={{ width: '100%' }} value={calculatedTotals.finalTotal} formatter={audFormatterFixed} parser={audParser} precision={2} />
                  </Form.Item>
                </>
              )}
            </Col>
          </Row>

          {/* Pay To Section and Submit Button... */}
          <Typography.Title level={4} style={{ marginTop: 30 }}>Pay To</Typography.Title>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="Acc Name"><Select defaultValue="" options={[{ }]} allowClear placeholder="New Bank Account" /></Form.Item>
              <Form.Item label="Bank Name"><Input /></Form.Item>
              <Form.Item label="BSB #"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Account #"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>

          <Row justify="end" style={{ marginTop: 30 }}>
            <Button type="dashed" htmlType='reset' style={{ marginRight: 10 }}>Reset Invoice</Button>
            <Button type="primary" size='large' htmlType="submit">Send Invoice</Button>
          </Row>

        </Form>
      </div>
    </div>
  )
}