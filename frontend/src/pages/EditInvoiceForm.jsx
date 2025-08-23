// frontend/src/pages/EditInvoiceForm.jsx
import { Link } from 'react-router-dom'
import { Button, Typography } from 'antd'

export default function EditInvoiceForm() {
  return (
    <div className="home-container">
      <Typography.Title level={1}>
        Edit Invoice
      </Typography.Title>
      <Typography.Paragraph>
        Use the form below to edit an existing invoice.
      </Typography.Paragraph>
      <div className="home-buttons">
        <Link to="/view-invoice">
          <Button type="primary">View All Invoices</Button>
        </Link>
        <Link to="/new-invoice">
          <Button type="primary">Create New Invoice</Button>
        </Link>
      </div>
    </div>
  )
}