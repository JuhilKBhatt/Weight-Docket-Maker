// ./frontend/src/components/invoice/PayAccountSection.jsx

import { Row, Col, Typography, Form, Input, InputNumber, Select } from 'antd';

export default function PayAccountSection({
  form,
  savedAccounts = [],
}) {
  const fillAccountDetails = (id) => {
    const acc = savedAccounts.find(x => x.id === id);
    if (!acc) return;

    form.setFieldsValue({
      accName: acc.accName,
      bankName: acc.bankName,
      bsb: acc.bsb,
      accountNumber: acc.accountNumber,
    });
  };
  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 30 }}>
        Pay To
      </Typography.Title>

      <Row gutter={24}>
        <Col span={8}>
          <Form.Item label="Saved Accounts" name="savedAccount">
            <Select
              allowClear
              placeholder="Select saved bank account"
              options={savedAccounts.map(acc => ({
                label: acc.label,
                value: acc.id,
              }))}
              onChange={fillAccountDetails}
            />
          </Form.Item>

          <Form.Item
            label="Account Name"
            name="accName"
            rules={[{ required: true, message: 'Account name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Bank Name"
            name="bankName"
            rules={[{ required: true, message: 'Bank name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="BSB"
            name="bsb"
            rules={[
              { required: true, message: 'BSB is required' },
              { len: 6, message: 'BSB must be 6 digits' },
            ]}
          >
            <Input
              style={{ width: '100%' }}
              controls={false}
            />
          </Form.Item>

          <Form.Item
            label="Account Number"
            name="accountNumber"
            rules={[{ required: true, message: 'Account number is required' }]}
          >
            <Input
              style={{ width: '100%' }}
              controls={false}
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}