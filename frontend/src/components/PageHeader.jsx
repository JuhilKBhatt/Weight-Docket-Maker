// ./frontend/src/components/PageHeader.jsx

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Typography, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

import { getBackRoute } from '../scripts/utilities/routeBackMap'; 

export default function PageHeader() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    const target = getBackRoute(location.pathname);
    navigate(target);
  };

  const isHome = location.pathname === '/';

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
      <Space>
        {!isHome && (
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
            style={{ fontSize: '16px', fontWeight: 'bold' }}
          >
            Back
          </Button>
        )}
      </Space>
    </div>
  );
}