// frontend/src/pages/InvoiceList.jsx
import { Link } from 'react-router-dom'
import { Button, Typography } from 'antd'

export default function InvoiceList() {
  return (
    <div className="home-container">
      <Typography.Title level={1}>
        View All Invoices
      </Typography.Title>
      <Typography.Paragraph>
        Here you can view all your invoices.
      </Typography.Paragraph>
      <div className="home-buttons">
        <Link to="/new-invoice">
          <Button type="primary">Create New Invoice</Button>
        </Link>
        <Link to="/edit-invoice">
          <Button type="primary">Edit An Invoice</Button>
        </Link>
      </div>
    </div>
  )
}