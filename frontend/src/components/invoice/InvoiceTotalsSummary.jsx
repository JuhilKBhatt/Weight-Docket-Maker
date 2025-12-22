import { Row, Col, Typography, Input, InputNumber, Button, Checkbox } from 'antd';
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';

export default function InvoiceTotalsSummary({
  includeGST,
  setIncludeGST,
  calculatedTotals,
  preGstDeductions,
  postGstDeductions,
  handleDeductionChange,
  addDeduction,
  removeDeduction,
}) {
  return (
    <Col span={12}>
      {/* Pre-GST deductions */}
      <Typography.Title level={5}>Deductions (Before GST)</Typography.Title>

      {preGstDeductions.map(d => (
        <Row gutter={10} key={d.key} style={{ marginBottom: 5 }}>
          <Col span={12}>
            <Input
              placeholder="Reason"
              value={d.label}
              onChange={(e) =>
                handleDeductionChange('pre', d.key, 'label', e.target.value)
              }
            />
          </Col>
          <Col span={8}>
            <InputNumber
              addonBefore="$"
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
      <InputNumber
        addonBefore="$"
        disabled
        style={{ width: '100%', marginTop: 20 }}
        value={
          includeGST
            ? calculatedTotals.grossTotal
            : calculatedTotals.finalTotal
        }
        formatter={audFormatterFixed}
        precision={2}
      />

      {/* GST */}
      <Row gutter={10} align="middle" style={{ marginTop: 10 }}>
        <Col flex="none">
          <Checkbox
            checked={includeGST}
            onChange={(e) => setIncludeGST(e.target.checked)}
          >
            GST (10%)
          </Checkbox>
        </Col>
        <Col flex="auto">
          {includeGST && (
            <InputNumber
              addonBefore="$"
              disabled
              style={{ width: '100%' }}
              value={calculatedTotals.gstAmount}
              formatter={audFormatterFixed}
              precision={2}
            />
          )}
        </Col>
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
                  value={d.label}
                  onChange={(e) =>
                    handleDeductionChange('post', d.key, 'label', e.target.value)
                  }
                />
              </Col>
              <Col span={8}>
                <InputNumber
                  addonBefore="$"
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

          <Button
            type="dashed"
            size="small"
            onClick={() => addDeduction('post')}
          >
            + Add Deduction
          </Button>

          {/* Final total */}
          <InputNumber
            addonBefore="$"
            disabled
            style={{ width: '100%', marginTop: 20, fontWeight: 'bold' }}
            value={calculatedTotals.finalTotal}
            formatter={audFormatterFixed}
            precision={2}
          />
        </>
      )}
    </Col>
  );
}