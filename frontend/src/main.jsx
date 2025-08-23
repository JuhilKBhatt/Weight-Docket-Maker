// frontend/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfigProvider } from 'antd'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#e60023', // red accent
            colorText: '#000000',    // black text
            colorBgBase: '#ffffff',  // white background
            fontSize: 18,
            fontSizeHeading1: 48,
            fontSizeHeading2: 36,
            fontSizeHeading3: 28,
          },
          components: {
            Button: {
              colorPrimary: '#e60023',
              colorPrimaryHover: '#b3001b', // darker red hover
              colorTextLightSolid: '#ffffff', // text inside primary buttons
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
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>,
)