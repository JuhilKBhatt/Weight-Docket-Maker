// frontend/src/pages/NewInvoiceForm.jsx
import { Link } from 'react-router-dom'
import { Button, Typography } from 'antd'

export default function NewInvoiceForm() {
  return (
    <div className="home-container">
      <Typography.Title level={1}>
        Create New Invoice
      </Typography.Title>
      <Typography.Paragraph>
        Use the form below to create a new invoice.
      </Typography.Paragraph>
      <div className="home-buttons">
        <Link to="/view-invoice">
          <Button type="primary">View All Invoices</Button>
        </Link>
        <Link to="/edit-invoice">
          <Button type="primary">Edit An Invoice</Button>
        </Link>
      </div>
    </div>
  )
}
