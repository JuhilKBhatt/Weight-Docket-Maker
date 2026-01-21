// frontend/src/pages/Home.jsx
import { Link } from 'react-router-dom'
import { Button, Typography } from 'antd'
import '../styles/Home.css'

export default function Home() {
  return (
    <div className="home-container">
      <Typography.Title level={1}>
        Welcome!
      </Typography.Title>
      <Typography.Paragraph>
        Use this application to create weight dockets and invoices.
      </Typography.Paragraph>
      <div className="home-buttons">
        <Link to="/DocketHome">
          <Button type="primary" style={{backgroundColor: '#324AB2'}} >Create Docket</Button>
        </Link>
        <Link to="/InvoiceHome">
          <Button type="primary">Create Invoice</Button>
        </Link>
      </div>
    </div>
  )
}