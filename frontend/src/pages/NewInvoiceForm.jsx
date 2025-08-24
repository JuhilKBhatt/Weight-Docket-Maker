// frontend/src/pages/NewInvoiceForm.jsx
import { Link } from 'react-router-dom'
import { Button, Typography, Select, Col, Row } from 'antd'
import '../styles/NewInvoiceForm.css'

export default function NewInvoiceForm() {
  return (
    <div className="home-container">
      <Typography.Title level={1}>
        Create New Invoice
      </Typography.Title>
      <Typography.Paragraph>
        Use the form below to create a new invoice.
      </Typography.Paragraph>
      <div className="form-container">
        <form>
          <Row>
            <Col span={10}>
              <Typography.Text strong>Bill From</Typography.Text>
              <input type="text" placeholder="Enter customer name" required />
            </Col>
            <Col span={8}>
              <Typography.Text strong>Bill From</Typography.Text>
              <input type="date" required />
            </Col>
            <Col span={6}>
            <Typography.Text strong>SCR No.</Typography.Text>
              <input disabled />
              <Typography.Text strong>Invoice Date</Typography.Text>
              <input type="date" required />
            </Col>
          </Row>

          <Row>
            <Col span={12}>
              <Typography.Text strong>Invoice Type</Typography.Text>
              <Select
                placeholder="Select invoice type"
                options={[
                  { value: 'Container', label: 'Container' },
                  { value: 'Metal', label: 'Metal' },
                ]}
                required
              />
            </Col>
          </Row>

          <Button type="primary" htmlType="submit" style={{ marginTop: '16px' }}>
            Submit Invoice
          </Button>
          <Link to="/invoices" style={{ marginLeft: '16px' }}>
            View All Invoices
          </Link>
        </form>
      </div>
    </div>
  )
}