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
    // 1. Special Handling for Settings (Global Page)
    if (location.pathname === '/settings') {
      // Check if there is history state to go back to (React Router specific)
      if (window.history.length > 2) { 
        navigate(-1);
      } else {
        // If opened directly in new tab, go Home instead of nowhere
        navigate('/'); 
      }
    } 
    // 2. Handle "New Docket -> Edit Docket" transition
    else if (location.state?.fromNew) {
        navigate('/DocketHome');
    }
    else {
      // 3. Standard Behavior: Use the static route map
      const target = getBackRoute(location.pathname);
      navigate(target);
    }
  };

  const isHome = location.pathname === '/';
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