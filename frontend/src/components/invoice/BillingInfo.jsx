// ./frontend/src/components/invoice/BillingInfo.jsx

import { Row, Col, Typography, Form, Input, InputNumber, Select, DatePicker, App } from 'antd';

export default function BillingInfo({
  form,
  scrinvID,
  invoiceType,
  setInvoiceType,
  dateFormat,
  savedCompaniesFrom = [],
  savedCompaniesTo = [],
}) {
  const { message } = App.useApp();

  // Watch the saved company selectors to toggle read-only state
  // We use the form instance to watch the specific fields
  const fromSavedVal = Form.useWatch('fromSavedCompany', form);
  const toSavedVal = Form.useWatch('toSavedCompany', form);

  // Determine if fields should be locked (if a value is selected)
  const isFromLocked = fromSavedVal !== undefined && fromSavedVal !== null;
  const isToLocked = toSavedVal !== undefined && toSavedVal !== null;

  // Handler to show message when clicking a locked field
  const handleFieldClick = (isLocked) => {
    if (isLocked) {
      message.warning("To edit this field, please go to settings.");
    }
  };

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

        <Form.Item label="Saved Companies" name="fromSavedCompany">
          <Select
            allowClear
            placeholder="New company"
            options={savedCompaniesFrom.map((c, idx) => ({
              label: c.name,
              value: idx
            }))}
            onChange={(idx) => {
              if (idx === undefined) {
                form.setFieldsValue({
                  fromCompanyName: '',
                  fromCompanyPhone: '',
                  fromCompanyEmail: '',
                  fromCompanyABN: '',
                  fromCompanyAddress: '',
                });
                return;
              }
              const c = savedCompaniesFrom[idx];
              form.setFieldsValue({
                fromCompanyName: c.name,
                fromCompanyPhone: c.phone,
                fromCompanyEmail: c.email,
                fromCompanyABN: c.abn,
                fromCompanyAddress: c.address,
              });
            }}
          />
        </Form.Item>

        <Form.Item label="Company Name" name="fromCompanyName" rules={[{ required: true, message: 'Company Name is required' }]}>
          <Input 
            maxLength={254} 
            readOnly={isFromLocked}
            onClick={() => handleFieldClick(isFromLocked)}
          />
        </Form.Item>

        <Form.Item label="Phone" name="fromCompanyPhone">
          <Input 
            maxLength={49} 
            style={{ width: '100%' }} 
            readOnly={isFromLocked}
            onClick={() => handleFieldClick(isFromLocked)}
          />
        </Form.Item>

        <Form.Item label="Email" name="fromCompanyEmail">
          <Input 
            maxLength={199} 
            readOnly={isFromLocked}
            onClick={() => handleFieldClick(isFromLocked)}
          />
        </Form.Item>

        <Form.Item
          label="ABN"
          name="fromCompanyABN"
          rules={[
            { len: 11, message: 'ABN must be 11 digits' } 
          ]}
          // This function runs on every keystroke, removing non-digits
          getValueFromEvent={(e) => e.target.value.replace(/\D/g, '')}
        >
          <Input 
            maxLength={11}
            style={{ width: '100%' }} 
            readOnly={isFromLocked}
            onClick={() => handleFieldClick(isFromLocked)}
          />
        </Form.Item>

        <Form.Item label="Address" name="fromCompanyAddress">
          <Input 
            maxLength={254}
            readOnly={isFromLocked}
            onClick={() => handleFieldClick(isFromLocked)}
          />
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

        <Form.Item label="Saved Companies" name="toSavedCompany">
          <Select
            allowClear
            placeholder="New company"
            options={savedCompaniesTo.map((c, idx) => ({
              label: c.name,
              value: idx
            }))}
            onChange={(idx) => {
              if (idx === undefined) {
                form.setFieldsValue({
                  toCompanyName: '',
                  toCompanyPhone: '',
                  toCompanyEmail: '',
                  toCompanyABN: '',
                  toCompanyAddress: '',
                });
                return;
              }
              const c = savedCompaniesTo[idx];
              form.setFieldsValue({
                toCompanyName: c.name,
                toCompanyPhone: c.phone,
                toCompanyEmail: c.email,
                toCompanyABN: c.abn,
                toCompanyAddress: c.address,
              });
            }}
          />
        </Form.Item>

        <Form.Item label="Company Name" name="toCompanyName" rules={[{ required: true, message: 'Company Name is required' }]}>
          <Input 
            maxLength={254} 
            readOnly={isToLocked}
            onClick={() => handleFieldClick(isToLocked)}
          />
        </Form.Item>

        <Form.Item label="Phone" name="toCompanyPhone">
          <Input 
            maxLength={49} 
            style={{ width: '100%' }} 
            readOnly={isToLocked}
            onClick={() => handleFieldClick(isToLocked)}
          />
        </Form.Item>

        <Form.Item label="Email" name="toCompanyEmail">
          <Input 
            maxLength={199} 
            readOnly={isToLocked}
            onClick={() => handleFieldClick(isToLocked)}
          />
        </Form.Item>

        <Form.Item
          label="ABN"
          name="toCompanyABN"
          rules={[
            { len: 11, message: 'ABN must be 11 digits' } 
          ]}
          getValueFromEvent={(e) => e.target.value.replace(/\D/g, '')}
        >
          <Input 
            maxLength={11} 
            style={{ width: '100%' }} 
            readOnly={isToLocked}
            onClick={() => handleFieldClick(isToLocked)}
          />
        </Form.Item>

        <Form.Item label="Address" name="toCompanyAddress">
          <Input 
            maxLength={254} 
            readOnly={isToLocked}
            onClick={() => handleFieldClick(isToLocked)}
          />
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

        <Form.Item label="TAX INVOICE ID:">
          <InputNumber readOnly value={scrinvID} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Date" name="date">
          <DatePicker format={dateFormat} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Invoice Type">
          <Select
            value={invoiceType}
            onChange={setInvoiceType}
            options={[
              { value: 'Container', label: 'Container' },
              { value: 'Pickup', label: 'Pickup / Drop Off' },
              {value: 'Other', label: 'Other' },
            ]}
          />
        </Form.Item>
      </Col>
    </Row>
  );
}