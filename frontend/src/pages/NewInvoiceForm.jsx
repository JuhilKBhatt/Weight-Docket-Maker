// frontend/src/pages/NewInvoiceForm.jsx
import React, { useState, useMemo } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Table, Typography, Checkbox, Row, Col, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import '../styles/InvoiceForm.css';
import InvoiceCalculationHandler from '../scripts/InvoiceCalculationHandler';

export default function NewInvoiceForm() {
  // State for raw data inputs
  const [items, setItems] = useState([
    { key: Date.now() + 1, seal: '', container: '', description: '', weight: undefined, price: undefined },
    { key: Date.now() + 2, seal: '', container: '', description: '', weight: undefined, price: undefined },
  ]);
  const [transportItems, setTransportItems] = useState([
    { key: '1', name: 'Containers', NumOfCTR: undefined, PricePreCTR: undefined },
    { key: '2', name: 'Overweight', NumOfCTR: undefined, PricePreCTR: undefined },
  ]);
  const [preGstDeductions, setPreGstDeductions] = useState([]);
  const [postGstDeductions, setPostGstDeductions] = useState([]);

  // State for form options/toggles
  const [invoiceType, setInvoiceType] = useState('Container');
  const [includeGST, setIncludeGST] = useState(true);
  const [showTransport, setShowTransport] = useState(false);

  // Date format for DatePicker
  const dateFormat = 'DD/MM/YYYY';

  // --- HANDLERS TO UPDATE STATE ---
  const handleItemChange = (key, field, value) => {
    setItems(prev => prev.map(item => (item.key === key ? { ...item, [field]: value } : item)));
  };
  const handleTransportChange = (key, field, value) => {
    setTransportItems(prev => prev.map(item => (item.key === key ? { ...item, [field]: value } : item)));
  };
  const handleDeductionChange = (type, key, field, value) => {
    const updater = type === 'pre' ? setPreGstDeductions : setPostGstDeductions;
    updater(prev => prev.map(d => (d.key === key ? { ...d, [field]: value } : d)));
  };

  // --- REAL-TIME CALCULATIONS ---
  const calculatedTotals = useMemo(() => {
    const calculator = new InvoiceCalculationHandler({
      items,
      transportItems: showTransport ? transportItems : [],
      preGstDeductions,
      postGstDeductions,
      includeGST,
    });
    return calculator.getCalculations();
  }, [items, transportItems, preGstDeductions, postGstDeductions, includeGST, showTransport]);


  // --- ROW MANAGEMENT ---
  const addRow = () => setItems([...items, { key: Date.now(), weight: undefined, price: undefined }]);
  const removeRow = (key) => setItems(items.filter(item => item.key !== key));
  const addDeduction = (type) => {
    const newDeduction = { key: Date.now(), label: '', amount: undefined };
    if (type === 'pre') setPreGstDeductions([...preGstDeductions, newDeduction]);
    else setPostGstDeductions([...postGstDeductions, newDeduction]);
  };
  const removeDeduction = (type, key) => {
    if (type === 'pre') setPreGstDeductions(preGstDeductions.filter(d => d.key !== key));
    else setPostGstDeductions(postGstDeductions.filter(d => d.key !== key));
  };

  // --- DYNAMIC TABLE COLUMNS ---
  const sharedColumns = [
    { title: 'Description', dataIndex: 'description', render: (_, record) => <Input value={record.description} onChange={(e) => handleItemChange(record.key, 'description', e.target.value)} /> },
    { title: 'Net Weight (in Tonne)', dataIndex: 'weight', render: (_, record) => <InputNumber addonAfter="t" style={{ width: '100%' }} value={record.weight} onChange={(val) => handleItemChange(record.key, 'weight', val)} /> },
    { title: '$AUD/Ton', dataIndex: 'price', render: (_, record) => <InputNumber addonBefore="$" style={{ width: '100%' }} value={record.price} onChange={(val) => handleItemChange(record.key, 'price', val)} /> },
    { title: 'Total', dataIndex: 'total', render: (_, record) => <InputNumber addonBefore="$" style={{ width: '100%' }} value={record.total} precision={2} disabled /> },
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
    { title: 'Price/CTR', dataIndex: 'PricePreCTR', render: (_, record) => <InputNumber addonBefore="$" style={{ width: '100%' }} value={record.PricePreCTR} onChange={(val) => handleTransportChange(record.key, 'PricePreCTR', val)} /> }
  ];

  return (
    <div className="home-container">
      <Typography.Title level={1}>Create New Invoice</Typography.Title>
      <Typography.Paragraph>Use the form below to create a new invoice.</Typography.Paragraph>

      <div className="form-container">
        <Form layout="vertical">
          {/* Top Section */}
          <Row gutter={24}>
            {/* Bill From, Bill To, and Invoice Details columns... */}
            <Col span={8}>
              <Typography.Title level={4} style={{ backgroundColor: '#2c2c2cff', color:'#ffffff', padding: '10px'}} >Bill From:
                <Select style={{marginLeft: 10}}  defaultValue="" options={[{ }]} allowClear placeholder="New Company" />
              </Typography.Title>
              <Form.Item label="Company Name"><Input /></Form.Item>
              <Form.Item label="Phone"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Email"><Input /></Form.Item>
              <Form.Item label="ABN"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Address"><Input /></Form.Item>
            </Col>

            <Col span={8}>
              <Typography.Title level={4} style={{ backgroundColor: '#2c2c2cff', color:'#ffffff', padding: '10px'}} >Bill To:
                <Select style={{marginLeft: 10}} options={[{ }]} allowClear placeholder="New Company" />
              </Typography.Title>
              <Form.Item label="Company Name"><Input /></Form.Item>
              <Form.Item label="Phone"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Email"><Input /></Form.Item>
              <Form.Item label="ABN"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Address"><Input /></Form.Item>
            </Col>

            <Col span={8}>
              <Typography.Title level={4} style={{ backgroundColor: '#2c2c2cff', color:'#ffffff', padding: '10px'}} >SCR No.:
                <InputNumber style={{marginLeft: 10}} disabled />
              </Typography.Title>
              <Form.Item label="Date"><DatePicker defaultValue={dayjs()} format={dateFormat} style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Invoice Type">
                <Select value={invoiceType} onChange={setInvoiceType} options={[{ value: 'Container', label: 'Container' }, { value: 'Pickup', label: 'Pickup' }]} />
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
                  <Col span={8}><InputNumber addonBefore="$" placeholder="Amount" style={{ width: '100%' }} value={d.amount} onChange={(val) => handleDeductionChange('pre', d.key, 'amount', val)} /></Col>
                  <Col span={4}><Button danger type="link" onClick={() => removeDeduction('pre', d.key)}>X</Button></Col>
                </Row>
              ))}
              <Button type="dashed" size="small" onClick={() => addDeduction('pre')}>+ Add Deduction</Button>

              {/* Subtotal & GST */}
              <Form.Item label={includeGST ? "Sub-Total" : "Total"} style={{ marginTop: 20 }}>
                <InputNumber addonBefore="$" disabled style={{ width: '100%' }} value={includeGST ? calculatedTotals.grossTotal : calculatedTotals.finalTotal} precision={2} />
              </Form.Item>

              <Row gutter={10} align="middle">
                <Col flex="none"><Checkbox checked={includeGST} onChange={(e) => setIncludeGST(e.target.checked)}>GST (10%)</Checkbox></Col>
                <Col flex="auto">{includeGST && <InputNumber addonBefore="$" disabled style={{ width: '100%' }} value={calculatedTotals.gstAmount} precision={2} />}</Col>
              </Row>

              {/* Post-GST deductions + Final Total */}
              {includeGST && (
                <>
                  <Typography.Title level={5} style={{ marginTop: 20 }}>Deductions (After GST)</Typography.Title>
                  {postGstDeductions.map(d => (
                     <Row gutter={10} key={d.key} style={{ marginBottom: 5 }}>
                      <Col span={12}><Input placeholder="Reason" value={d.label} onChange={(e) => handleDeductionChange('post', d.key, 'label', e.target.value)} /></Col>
                      <Col span={8}><InputNumber addonBefore="$" placeholder="Amount" style={{ width: '100%' }} value={d.amount} onChange={(val) => handleDeductionChange('post', d.key, 'amount', val)} /></Col>
                      <Col span={4}><Button danger type="link" onClick={() => removeDeduction('post', d.key)}>X</Button></Col>
                    </Row>
                  ))}
                  <Button type="dashed" size="small" onClick={() => addDeduction('post')}>+ Add Deduction</Button>
                  <Form.Item label="Total" style={{ marginTop: 20, fontWeight: 'bold' }}>
                    <InputNumber addonBefore="$" disabled style={{ width: '100%' }} value={calculatedTotals.finalTotal} precision={2} />
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