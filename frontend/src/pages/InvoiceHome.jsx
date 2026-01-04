// frontend/src/pages/InvoiceMaker.jsx
import { Link } from 'react-router-dom'
import { Button, Typography } from 'antd'
import '../styles/Home.css'

export default function InvoiceMaker() {
  return (
    <div className="home-container">
      <Typography.Title level={1}>
        Invoice System 
      </Typography.Title>
      <Typography.Paragraph>
        Choose an action to perform:
      </Typography.Paragraph>
      <div className="home-buttons">
        <Link to="/new-invoice">
          <Button type="primary">Make New Invoice</Button>
        </Link>
        <Link to="/view-invoice">
          <Button type="primary">View Saved Invoice</Button>
        </Link>
        <Link to='/sales-invoices'>
          <Button type="primary" disabled>View Sales Record</Button>
        </Link>
      </div>
    </div>
  )
}