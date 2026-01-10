// ./frontend/src/components/invoice/InvoiceTotalsSummary.jsx

import { Row, Col, Typography, Input, InputNumber, Button, Checkbox } from 'antd';
import { audFormatter, audParser, audFormatterFixed } from '../scripts/utilities/AUDformatters';
import { getCurrencyLabel } from '../scripts/utilities/invoiceConstants';

export default function InvoiceTotalsSummary({
  includeGST,
  setIncludeGST,
  gstPercentage,
  setGstPercentage,
  calculatedTotals,
  preGstDeductions,
  postGstDeductions,
  handleDeductionChange,
  addDeduction,
  removeDeduction,
  currency = 'AUD',
}) {
  
  // Use Helper
  const symbolLabel = getCurrencyLabel(currency);

  return (
    <Col span={12}>
      <Typography.Title level={5}>Deductions (Before GST)</Typography.Title>

      {preGstDeductions.map(d => (
        <Row gutter={10} key={d.key} style={{ marginBottom: 5 }}>
          <Col span={12}>
            <Input
              placeholder="Reason"
              maxLength={25}
              value={d.label}
              onChange={(e) =>
                handleDeductionChange('pre', d.key, 'label', e.target.value)
              }
            />
          </Col>
          <Col span={8}>
            <InputNumber
              addonBefore={symbolLabel}
              style={{ width: '100%' }}
              value={d.amount}
              formatter={audFormatter}
              parser={audParser}
              onChange={(val) =>
                handleDeductionChange('pre', d.key, 'amount', val)
              }
            />
          </Col>
          <Col span={4}>
            <Button
              danger
              type="link"
              onClick={() => removeDeduction('pre', d.key)}
            >
              X
            </Button>
          </Col>
        </Row>
      ))}

      <Button type="dashed" size="small" onClick={() => addDeduction('pre')}>
        + Add Deduction
      </Button>

      {/* Subtotal */}
      <Row align="middle" style={{ marginTop: 20 }}>
        <Col flex="120px">
          <Typography.Text strong>
            {includeGST ? `Sub-Total:` : `Total (${currency}):`}
          </Typography.Text>
        </Col>
        <Col flex="auto">
          <InputNumber
            addonBefore={symbolLabel}
            disabled
            style={{ width: '100%' }}
            value={includeGST ? calculatedTotals.grossTotal : calculatedTotals.finalTotal}
            formatter={audFormatterFixed}
            precision={2}
          />
        </Col>
      </Row>

      {/* GST Section */}
      <Row align="middle" style={{ marginTop: 10 }}>
        <Col flex="120px">
          <Checkbox checked={includeGST} onChange={(e) => setIncludeGST(e.target.checked)}>
            GST:
          </Checkbox>
        </Col>
        
        {/* If GST is enabled, show Percentage Input and Amount */}
        {includeGST && (
          <Col flex="auto" style={{ display: 'flex', gap: '10px' }}>
             {/* Percentage Input */}
            <InputNumber
              addonAfter="%"
              min={0}
              max={100}
              style={{ width: '100px' }}
              value={gstPercentage}
              onChange={(val) => setGstPercentage(val)}
            />

             {/* Calculated Amount */}
            <InputNumber
              addonBefore={symbolLabel}
              disabled
              style={{ flex: 1 }}
              value={calculatedTotals.gstAmount}
              formatter={audFormatterFixed}
              precision={2}
            />
          </Col>
        )}
      </Row>

      {/* Post-GST deductions */}
      {includeGST && (
        <>
          <Typography.Title level={5} style={{ marginTop: 20 }}>
            Deductions (After GST)
          </Typography.Title>

          {postGstDeductions.map(d => (
            <Row gutter={10} key={d.key} style={{ marginBottom: 5 }}>
              <Col span={12}>
                <Input
                  placeholder="Reason"
                  maxLength={25}
                  value={d.label}
                  onChange={(e) =>
                    handleDeductionChange('post', d.key, 'label', e.target.value)
                  }
                />
              </Col>
              <Col span={8}>
                <InputNumber
                  addonBefore={symbolLabel}
                  style={{ width: '100%' }}
                  value={d.amount}
                  formatter={audFormatter}
                  parser={audParser}
                  onChange={(val) =>
                    handleDeductionChange('post', d.key, 'amount', val)
                  }
                />
              </Col>
              <Col span={4}>
                <Button
                  danger
                  type="link"
                  onClick={() => removeDeduction('post', d.key)}
                >
                  X
                </Button>
              </Col>
            </Row>
          ))}

          <Button type="dashed" size="small" onClick={() => addDeduction('post')}>
            + Add Deduction
          </Button>

          {/* Final Total */}
          <Row align="middle" style={{ marginTop: 20 }}>
            <Col flex="120px">
              <Typography.Text strong>Total:</Typography.Text>
            </Col>
            <Col flex="auto">
              <InputNumber
                addonBefore={symbolLabel}
                disabled
                style={{ width: '100%', fontWeight: 'bold' }}
                value={calculatedTotals.finalTotal}
                formatter={audFormatterFixed}
                precision={2}
              />
            </Col>
          </Row>
        </>
      )}
    </Col>
  );
}