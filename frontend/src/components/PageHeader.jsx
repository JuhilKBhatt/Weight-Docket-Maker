// frontend/src/components/Header.jsx
import { useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import '../styles/PageHeader.css'

export default function PageHeader() {
    let navigate = useNavigate();
  return (
    <header>
      <Button onClick={() => navigate(-1)}>Back</Button>
    </header>
  );
}