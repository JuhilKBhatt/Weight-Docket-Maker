// frontend/src/pages/NewInvoiceForm.jsx
import { Link } from 'react-router-dom'
import React, { useState } from 'react'
import { Form, Input, InputNumber, Select, DatePicker, Button, Table, Typography, Checkbox, Row, Col } from 'antd'
import '../styles/NewInvoiceForm.css'

export default function NewInvoiceForm() {
const [items, setItems] = useState([])

  // Columns for line items table
  const columns = [
    { title: '', dataIndex: 'seal', render: () => <Input /> },
    { title: '', dataIndex: 'container', render: () => <Input /> },
    { title: '', dataIndex: 'description', render: () => <Input /> },
    { title: 'Net Weight (in Ton)', dataIndex: 'weight', render: () => <InputNumber style={{ width: '100%' }} /> },
    { title: '$AUD/Ton', dataIndex: 'price', render: () => <InputNumber style={{ width: '100%' }} /> },
    { title: 'Total', dataIndex: 'total', render: () => <InputNumber style={{ width: '100%' }} disabled /> },
  ]

  return (
    <div className="home-container">
      <Typography.Title level={1}>
        Create New Invoice
      </Typography.Title>
      <Typography.Paragraph>
        Use the form below to create a new invoice.
      </Typography.Paragraph>
      <div className="form-container">
        <Form>
          {/* Top section: Bill From / Bill To */}
          <Row gutter={24}>
            <Col span={8}>
              <Typography.Title level={4}>Bill From:<Select /></Typography.Title>
              <Form.Item label="Company Name"><Input /></Form.Item>
              <Form.Item label="Phone"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Email"><Input /></Form.Item>
              <Form.Item label="ABN"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Address"><Input /></Form.Item>
            </Col>

            <Col span={8}>
              <Typography.Title level={4}>Bill To:<Select /></Typography.Title>
              <Form.Item label="Company Name"><Input /></Form.Item>
              <Form.Item label="Phone"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Email"><Input /></Form.Item>
              <Form.Item label="ABN"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Address"><Input /></Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item label="SCR No."><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Invoice Type"><Select /></Form.Item>
            </Col>
          </Row>

          {/* Line items table */}
          <Typography.Title level={5}>Line Items</Typography.Title>
          <Table
            columns={columns}
            dataSource={items}
            pagination={false}
            bordered
          />
          <div style={{ marginTop: 10 }}>
            <Button type="dashed" onClick={() => setItems([...items, {}])}>
              + Add Row
            </Button>
          </div>

          {/* Checkboxes */}
          <div style={{ marginTop: 20 }}>
            <Checkbox>Transport</Checkbox>
            <Checkbox style={{ marginLeft: 10 }}>Overweight</Checkbox>
          </div>

          {/* Notes and Totals */}
          <Row gutter={24} style={{ marginTop: 20 }}>
            <Col span={12}>
              <Form.Item label="Notes"><Input.TextArea rows={4} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Sub-Total"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Button type="dashed">+ Add Discount</Button>
              <Form.Item label="GST"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Total"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Button type="dashed">+ Add Discount</Button>
            </Col>
          </Row>

          {/* Pay To Section */}
          <Typography.Title level={4} style={{ marginTop: 30 }}>Pay To</Typography.Title>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="Acc Name"><Select /></Form.Item>
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