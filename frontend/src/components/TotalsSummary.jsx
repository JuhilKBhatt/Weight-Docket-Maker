// ./frontend/src/components/TotalsSummary.jsx

import { Row, Col, Typography, Input, InputNumber, Button, Checkbox } from 'antd';
import { audFormatter, audParser, audFormatterFixed, isValidInput } from '../scripts/utilities/AUDFormatters';

export default function TotalsSummary({
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
  currencySymbol = '$' 
}) {
  
  const symbolLabel = `${currency}${currencySymbol}`;

  // Helper handler for Amount fields
  const onAmountChange = (type, key, e) => {
    const rawValue = e.target.value;
    const parsedValue = audParser(rawValue);
    
    // Allow max 2 decimals for currency
    if (isValidInput(parsedValue, 2)) {
      handleDeductionChange(type, key, 'amount', parsedValue);
    }
  };

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
            <Input
              addonBefore={symbolLabel}
              style={{ width: '100%' }}
              // Use audFormatter for comma display
              value={audFormatter(d.amount)}
              onChange={(e) => onAmountChange('pre', d.key, e)}
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
            readOnly
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
        
        {includeGST && (
          <Col flex="auto" style={{ display: 'flex', gap: '10px' }}>
            <InputNumber
              addonAfter="%"
              min={0}
              max={100}
              style={{ width: '100px' }}
              value={gstPercentage}
              onChange={(val) => setGstPercentage(val)}
            />

            <InputNumber
              addonBefore={symbolLabel}
              readOnly
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
                <Input
                  addonBefore={symbolLabel}
                  style={{ width: '100%' }}
                  // Use audFormatter for comma display
                  value={audFormatter(d.amount)}
                  onChange={(e) => onAmountChange('post', d.key, e)}
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
                readOnly
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