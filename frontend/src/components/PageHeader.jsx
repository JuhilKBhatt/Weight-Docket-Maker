// ./frontend/src/components/PageHeader.jsx

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Space } from 'antd';
import { ArrowLeftOutlined, SettingOutlined } from '@ant-design/icons';

import { getBackRoute } from '../scripts/utilities/routeBackMap'; 

export default function PageHeader() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    // If on Settings page, go back to the previous page in history
    if (location.pathname === '/settings') {
      navigate(-1);
    } else {
      // Default behavior: Use the static route map
      const target = getBackRoute(location.pathname);
      navigate(target);
    }
  };

  const isHome = location.pathname === '/';
  
  // Hide settings button if already on settings page
  const isSettings = location.pathname === '/settings';

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
      {/* Left Side: Back Button */}
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

      {/* Right Side: Settings Button */}
      <Space>
        {!isSettings && (
          <Button 
            type="text"
            icon={<SettingOutlined />}
            onClick={() => navigate('/settings')}
            style={{ fontSize: '16px' }}
          >
            Settings
          </Button>
        )}
      </Space>
    </div>
  );
}