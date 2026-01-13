// frontend/src/pages/DocketHome.jsx
import { Link } from 'react-router-dom'
import { Button, Typography } from 'antd'
import '../styles/Home.css'

export default function DocketHome() {
  return (
    <div className="home-container">
      <Typography.Title level={1}>
        Docket System
      </Typography.Title>
      <Typography.Paragraph>
        Choose an action to perform:
      </Typography.Paragraph>
      <div className="home-buttons">
        <Link to="/new-docket">
          <Button type="primary">New Docket</Button>
        </Link>
        <Link to="/view-docket">
          <Button type="primary">View Saved Docket</Button>
        </Link>
        <Link to='/inventory-report'>
          <Button type="primary">View Inventory</Button>
        </Link>
      </div>
    </div>
  )
}