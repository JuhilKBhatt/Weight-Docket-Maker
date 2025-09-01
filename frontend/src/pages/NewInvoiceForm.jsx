// frontend/src/pages/NewInvoiceForm.jsx
import React, { useState } from 'react'
import { Form, Input, InputNumber, Select, DatePicker, Button, Table, Typography, Checkbox, Row, Col, Popconfirm } from 'antd'
import dayjs from 'dayjs'
import '../styles/NewInvoiceForm.css'

export default function NewInvoiceForm() {
  const [items, setItems] = useState([
    { key: Date.now() + 1 },
    { key: Date.now() + 2 },
    { key: Date.now() + 3 },
    { key: Date.now() + 4 }
  ])
  const [invoiceType, setInvoiceType] = useState('Container')
  const [includeGST, setIncludeGST] = useState(true)
  const [showTransport, setShowTransport] = useState(false)

  // Deductions (arrays of {key, label, amount})
  const [preGstDeductions, setPreGstDeductions] = useState([])
  const [postGstDeductions, setPostGstDeductions] = useState([])

  const dateFormat = 'DD/MM/YYYY';

  // Add/remove rows
  const addRow = () => setItems([...items, { key: Date.now() }])
  const removeRow = (key) => setItems(items.filter(item => item.key !== key))

  const addDeduction = (type) => {
    const newDeduction = { key: Date.now(), label: '', amount: 0 }
    if (type === 'pre') setPreGstDeductions([...preGstDeductions, newDeduction])
    else setPostGstDeductions([...postGstDeductions, newDeduction])
  }

  const removeDeduction = (type, key) => {
    if (type === 'pre') setPreGstDeductions(preGstDeductions.filter(d => d.key !== key))
    else setPostGstDeductions(postGstDeductions.filter(d => d.key !== key))
  }

  // Columns for line items
  const containerColumns = [
    { title: 'Seal #', dataIndex: 'seal', render: () => <Input /> },
    { title: 'Container #', dataIndex: 'container', render: () => <Input /> },
    { title: 'Description', dataIndex: 'description', render: () => <Input /> },
    { title: 'Net Weight (in Tonne)', dataIndex: 'weight', render: () => <InputNumber addonAfter="t" style={{ width: '100%' }} /> },
    { title: '$AUD/Ton', dataIndex: 'price', render: () => <InputNumber addonBefore="$" style={{ width: '100%' }} /> },
    { title: 'Total', dataIndex: 'total', render: () => <InputNumber addonBefore="$" style={{ width: '100%' }} disabled /> },
    {
      title: '',
      dataIndex: 'actions',
      render: (_, record) =>
        <Popconfirm title="Remove this row?" onConfirm={() => removeRow(record.key)}>
          <Button danger type="link">X</Button>
        </Popconfirm>
    }
  ]

  const pickupColumns = [
    { title: '#', dataIndex: 'seal', render: () => <Input /> },
    { title: 'Metal', dataIndex: 'container', render: () => <Input /> },
    { title: 'Description', dataIndex: 'description', render: () => <Input /> },
    { title: 'Net Weight (in Tonne)', dataIndex: 'weight', render: () => <InputNumber addonAfter="t" style={{ width: '100%' }} /> },
    { title: '$AUD/Ton', dataIndex: 'price', render: () => <InputNumber addonBefore="$" style={{ width: '100%' }} /> },
    { title: 'Total', dataIndex: 'total', render: () => <InputNumber addonBefore="$" style={{ width: '100%' }} disabled /> },
    {
      title: '',
      dataIndex: 'actions',
      render: (_, record) =>
        <Popconfirm title="Remove this row?" onConfirm={() => removeRow(record.key)}>
          <Button danger type="link">X</Button>
        </Popconfirm>
    }
  ]

  // Transport rows
  const transportData = [
    { key: '1', name: 'Containers' },
    { key: '2', name: 'Overweight' }
  ]

  const transportColumns = [
    { title: 'Item', dataIndex: 'name' },
    {
      title: 'Number for Containers',
      dataIndex: 'NumOfCTR',
      render: () => <InputNumber addonAfter="CTR" style={{ width: '100%' }} />
    },
    {
      title: 'Price/CTR',
      dataIndex: 'PricePreCTR',
      render: () => <InputNumber addonBefore="$" style={{ width: '100%' }} />
    }
  ]

  return (
    <div className="home-container">
      <Typography.Title level={1}>Create New Invoice</Typography.Title>
      <Typography.Paragraph>Use the form below to create a new invoice.</Typography.Paragraph>

      <div className="form-container">
        <Form>
          {/* Top Section */}
          <Row gutter={24}>
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
                <Select
                  value={invoiceType}
                  onChange={(val) => setInvoiceType(val)}
                  options={[
                    { value: 'Container', label: 'Container' },
                    { value: 'Pickup', label: 'Pickup' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Invoice Items */}
          <Typography.Title level={5}>Invoice Items</Typography.Title>
          <Table
            columns={invoiceType === 'Container' ? containerColumns : pickupColumns}
            dataSource={items}
            pagination={false}
            bordered
          />
          <Button type="dashed" onClick={addRow} style={{ marginTop: 10 }}>
            + Add Row
          </Button>

          {/* Transport Section */}
          <div style={{ marginTop: 20 }}>
            <Checkbox checked={showTransport} onChange={(e) => setShowTransport(e.target.checked)}>
              Add Transport
            </Checkbox>
          </div>
          {showTransport && (
            <div style={{ marginTop: 10 }}>
              <Typography.Title level={5}>Transport Charges</Typography.Title>
              <Table
                columns={transportColumns}
                dataSource={transportData}
                pagination={false}
                bordered
              />
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
                  <Col span={12}><Input placeholder="Reason" /></Col>
                  <Col span={8}><InputNumber addonBefore="$" placeholder="Amount" style={{ width: '100%' }} /></Col>
                  <Col span={4}>
                    <Button danger type="link" onClick={() => removeDeduction('pre', d.key)}>X</Button>
                  </Col>
                </Row>
              ))}
              <Button type="dashed" size="small" onClick={() => addDeduction('pre')}>+ Add Deduction</Button>

              {/* Subtotal & GST */}
              <Form.Item label={includeGST ? "Sub-Total" : "Total"} style={{ marginTop: 20 }}>
                <InputNumber addonBefore="$" disabled style={{ width: '100%' }} />
              </Form.Item>

              {/* GST Checkbox + GST field */}
              <Row gutter={10} align="middle">
                <Col flex="none">
                  <Checkbox checked={includeGST} onChange={(e) => setIncludeGST(e.target.checked)}>
                    GST
                  </Checkbox>
                </Col>
                <Col flex="auto">
                  {includeGST && (
                    <InputNumber addonBefore="$" disabled style={{ width: '100%' }} />
                  )}
                </Col>
              </Row>

              {/* Post-GST deductions + Final Total (only if GST is checked) */}
              {includeGST && (
                <>
                  {/* Post-GST deductions */}
                  <Typography.Title level={5} style={{ marginTop: 20 }}>
                    Deductions (After GST)
                  </Typography.Title>
                  {postGstDeductions.map(d => (
                    <Row gutter={10} key={d.key} style={{ marginBottom: 5 }}>
                      <Col span={12}><Input placeholder="Reason" /></Col>
                      <Col span={8}><InputNumber addonBefore="$" placeholder="Amount" style={{ width: '100%' }} /></Col>
                      <Col span={4}>
                        <Button danger type="link" onClick={() => removeDeduction('post', d.key)}>X</Button>
                      </Col>
                    </Row>
                  ))}
                  <Button type="dashed" size="small" onClick={() => addDeduction('post')}>
                    + Add Deduction
                  </Button>

                  {/* Final Total */}
                  <Form.Item label="Total" style={{ marginTop: 20 }}>
                    <InputNumber addonBefore="$" disabled style={{ width: '100%' }} />
                  </Form.Item>
                </>
              )}
            </Col>
          </Row>

          {/* Pay To */}
          <Typography.Title level={4} style={{ marginTop: 30 }}>Pay To</Typography.Title>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="Acc Name"><Select defaultValue="" options={[{ }]} allowClear placeholder="New Bank Account" /></Form.Item>
              <Form.Item label="Bank Name"><Input /></Form.Item>
              <Form.Item label="BSB #"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Account #"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>

          {/* Submit Button */}
          <Row gutter={24}>
            <Col span={24} style={{ textAlign: 'right' }}>
              <Form.Item>
                <Button type="primary" size='large' htmlType="submit" style={{ marginRight: 10, marginTop: 30, padding: '25px' }}>
                  Send Invoice
                </Button>
              </Form.Item>
              <Form.Item>
                <Button type="dashed" size='small' htmlType='reset' style={{ marginRight: 10 }}>
                  Reset Invoice
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  )
}