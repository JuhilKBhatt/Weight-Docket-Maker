// frontend/src/components/Header.jsx

import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'antd';
import { routeBackMap } from '../scripts/utilities/routeBackMap';

export default function PageHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    const fallback = routeBackMap[location.pathname] || '/';
    navigate(fallback);
  };

  return (
    <header>
      <Button size='large' onClick={handleBack}>Back</Button>
    </header>
  );
}