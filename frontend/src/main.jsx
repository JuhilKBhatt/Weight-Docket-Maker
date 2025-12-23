// frontend/src/main.jsx

// Main entry point for the React application
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';

// Main App
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#e60023',
            colorText: '#000000',
            colorBgBase: '#ffffff',
            fontSize: 18,
            fontSizeHeading1: 48,
            fontSizeHeading2: 36,
            fontSizeHeading3: 28,
          },
          components: {
            Button: {
              colorPrimary: '#e60023',
              colorPrimaryHover: '#b3001b',
              colorTextLightSolid: '#ffffff',
              borderRadius: 6,
              fontWeight: 600,
            },
            Typography: {
              colorTextHeading: '#000000',
              colorText: '#000000',
            },
          },
        }}
      >
        <AntdApp>
          <App />
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);