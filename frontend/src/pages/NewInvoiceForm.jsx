// frontend/src/pages/NewInvoiceForm.jsx
import { Link } from 'react-router-dom'
import React, { useState } from 'react'
import { Form, Input, InputNumber, Select, DatePicker, Button, Table, Typography, Checkbox, Row, Col, Popconfirm } from 'antd'
import '../styles/NewInvoiceForm.css'

export default function NewInvoiceForm() {
  const [items, setItems] = useState([])
  const [invoiceType, setInvoiceType] = useState('Container')
  const [includeGST, setIncludeGST] = useState(true)

  // Deductions (arrays of {key, label, amount})
  const [preGstDeductions, setPreGstDeductions] = useState([])
  const [postGstDeductions, setPostGstDeductions] = useState([])

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
    { title: 'Net Weight (in Ton)', dataIndex: 'weight', render: () => <InputNumber style={{ width: '100%' }} /> },
    { title: '$AUD/Ton', dataIndex: 'price', render: () => <InputNumber style={{ width: '100%' }} /> },
    { title: 'Total', dataIndex: 'total', render: () => <InputNumber style={{ width: '100%' }} disabled /> },
    {
      title: 'Actions',
      dataIndex: 'actions',
      render: (_, record) =>
        <Popconfirm title="Remove this row?" onConfirm={() => removeRow(record.key)}>
          <Button danger type="link">Remove</Button>
        </Popconfirm>
    }
  ]

  const pickupColumns = [
    { title: '#', dataIndex: 'seal', render: () => <Input /> },
    { title: 'Metal', dataIndex: 'container', render: () => <Input /> },
    { title: 'Description', dataIndex: 'description', render: () => <Input /> },
    { title: 'Net Weight (in Ton)', dataIndex: 'weight', render: () => <InputNumber style={{ width: '100%' }} /> },
    { title: '$AUD/Ton', dataIndex: 'price', render: () => <InputNumber style={{ width: '100%' }} /> },
    { title: 'Total', dataIndex: 'total', render: () => <InputNumber style={{ width: '100%' }} disabled /> },
    {
      title: 'Actions',
      dataIndex: 'actions',
      render: (_, record) =>
        <Popconfirm title="Remove this row?" onConfirm={() => removeRow(record.key)}>
          <Button danger type="link">Remove</Button>
        </Popconfirm>
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
              <Typography.Title level={4}>Bill From:</Typography.Title>
              <Form.Item label="Company Name"><Input /></Form.Item>
              <Form.Item label="Phone"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Email"><Input /></Form.Item>
              <Form.Item label="ABN"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Address"><Input /></Form.Item>
            </Col>

            <Col span={8}>
              <Typography.Title level={4}>Bill To:</Typography.Title>
              <Form.Item label="Company Name"><Input /></Form.Item>
              <Form.Item label="Phone"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Email"><Input /></Form.Item>
              <Form.Item label="ABN"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Address"><Input /></Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item label="SCR No."><InputNumber disabled style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
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

          {/* Line Items */}
          <Typography.Title level={5}>Line Items</Typography.Title>
          <Table
            columns={invoiceType === 'Container' ? containerColumns : pickupColumns}
            dataSource={items}
            pagination={false}
            bordered
          />
          <Button type="dashed" onClick={addRow} style={{ marginTop: 10 }}>
            + Add Row
          </Button>

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
                  <Col span={8}><InputNumber placeholder="Amount" style={{ width: '100%' }} /></Col>
                  <Col span={4}>
                    <Button danger type="link" onClick={() => removeDeduction('pre', d.key)}>Remove</Button>
                  </Col>
                </Row>
              ))}
              <Button type="dashed" size="small" onClick={() => addDeduction('pre')}>+ Add Deduction</Button>

              {/* Subtotal & GST */}
              <Form.Item label={includeGST ? "Sub-Total" : "Total"} style={{ marginTop: 20 }}>
                <InputNumber disabled style={{ width: '100%' }} />
              </Form.Item>

              {/* GST Checkbox + GST field */}
              {includeGST && (
                <>
                  <Row gutter={10} align="middle">
                    <Col flex="none">
                      <Checkbox checked={includeGST} onChange={(e) => setIncludeGST(e.target.checked)}>GST</Checkbox>
                    </Col>
                    <Col flex="auto">
                      <InputNumber disabled style={{ width: '100%' }} />
                    </Col>
                  </Row>
                </>
              )}

              {/* Post-GST deductions */}
              <Typography.Title level={5} style={{ marginTop: 20 }}>Deductions (After GST)</Typography.Title>
              {postGstDeductions.map(d => (
                <Row gutter={10} key={d.key} style={{ marginBottom: 5 }}>
                  <Col span={12}><Input placeholder="Reason" /></Col>
                  <Col span={8}><InputNumber placeholder="Amount" style={{ width: '100%' }} /></Col>
                  <Col span={4}>
                    <Button danger type="link" onClick={() => removeDeduction('post', d.key)}>Remove</Button>
                  </Col>
                </Row>
              ))}
              <Button type="dashed" size="small" onClick={() => addDeduction('post')}>+ Add Deduction</Button>

              {/* Final Total */}
              <Form.Item label="Final Total" style={{ marginTop: 20 }}>
                <InputNumber disabled style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Pay To */}
          <Typography.Title level={4} style={{ marginTop: 30 }}>Pay To</Typography.Title>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="Acc Name"><Input /></Form.Item>
              <Form.Item label="Bank Name"><Input /></Form.Item>
              <Form.Item label="BSB #"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Account #"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  )
}