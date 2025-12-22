// ./frontend/src/components/invoice/BillingInfo.jsx

import { Row, Col, Typography, Form, Input, InputNumber, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';

export default function BillingInfo({
  invoiceType,
  setInvoiceType,
  dateFormat,
}) {
  return (
    <Row gutter={24}>
      {/* Bill From */}
      <Col span={8}>
        <Typography.Title
          level={4}
          style={{ backgroundColor: '#2c2c2cff', color: '#ffffff', padding: '10px' }}
        >
          Bill From
        </Typography.Title>

        <Form.Item label="Company Name" name="fromCompanyName">
          <Input />
        </Form.Item>

        <Form.Item label="Phone" name="fromCompanyPhone">
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Email" name="fromCompanyEmail">
          <Input />
        </Form.Item>

        <Form.Item label="ABN" name="fromCompanyABN">
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Address" name="fromCompanyAddress">
          <Input />
        </Form.Item>
      </Col>

      {/* Bill To */}
      <Col span={8}>
        <Typography.Title
          level={4}
          style={{ backgroundColor: '#2c2c2cff', color: '#ffffff', padding: '10px' }}
        >
          Bill To
        </Typography.Title>

        <Form.Item label="Company Name" name="toCompanyName">
          <Input />
        </Form.Item>

        <Form.Item label="Phone" name="toCompanyPhone">
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Email" name="toCompanyEmail">
          <Input />
        </Form.Item>

        <Form.Item label="ABN" name="toCompanyABN">
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Address" name="toCompanyAddress">
          <Input />
        </Form.Item>
      </Col>

      {/* Invoice Details */}
      <Col span={8}>
        <Typography.Title
          level={4}
          style={{ backgroundColor: '#2c2c2cff', color: '#ffffff', padding: '10px' }}
        >
          Invoice Details
        </Typography.Title>

        <Form.Item label="SCR No.">
          <InputNumber disabled style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Date" name="date" initialValue={dayjs()}>
          <DatePicker format={dateFormat} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Invoice Type">
          <Select
            value={invoiceType}
            onChange={setInvoiceType}
            options={[
              { value: 'Container', label: 'Container' },
              { value: 'Pickup', label: 'Pickup / Drop Off' },
              { value: 'Custom', label: 'Custom' },
            ]}
          />
        </Form.Item>
      </Col>
    </Row>
  );
}