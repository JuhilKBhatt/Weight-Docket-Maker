// frontend/src/pages/Home.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { Button, Typography } from 'antd'
import '../styles/Home.css'

export default function Home() {
  return (
    <div className="home-container">
      <Typography.Title>Welcome!</Typography.Title>
      <Typography.Paragraph>
        Use this application to create weight dockets and invoices.
      </Typography.Paragraph>
      <div className="home-buttons">
        <Link to="/docket">
          <Button type="primary">Create Docket</Button>
        </Link>
        <Link to="/invoice">
          <Button type="primary">Create Invoice</Button>
        </Link>
      </div>
    </div>
  )
}