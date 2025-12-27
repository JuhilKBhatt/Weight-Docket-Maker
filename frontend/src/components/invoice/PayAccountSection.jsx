// ./frontend/src/components/invoice/PayAccountSection.jsx

import { Row, Col, Typography, Form, Input, InputNumber, Select } from 'antd';

export default function PayAccountSection({
  form,
  savedAccounts = [],
}) {
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
              placeholder="Select an account"
              options={savedAccounts.map((a, idx) => ({
                label: a.account_name + " - " + a.bank_name,
                value: idx
              }))}
              onChange={(idx) => {
                if (idx === undefined) {
                  form.setFieldsValue({
                    accName: '',
                    bankName: '',
                    bsb: '',
                    accountNumber: '',
                  });
                  return;
                }
                const a = savedAccounts[idx];
                form.setFieldsValue({
                  accName: a.account_name,
                  bankName: a.bank_name,
                  bsb: a.bsb,
                  accountNumber: a.account_number,
                });
              }}
            />
          </Form.Item>

          <Form.Item
            label="Account Name"
            name="accName"
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Bank Name"
            name="bankName"
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="BSB"
            name="bsb"
          >
            <Input
              style={{ width: '100%' }}
              controls={false}
            />
          </Form.Item>

          <Form.Item
            label="Account Number"
            name="accountNumber"
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