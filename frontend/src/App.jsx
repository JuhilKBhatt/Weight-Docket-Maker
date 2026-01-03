// frontend/src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from 'antd' // Removed Flex
import PageHeader from './components/PageHeader.jsx'

// Importing components for different routes
import Home from './pages/Home.jsx'
import DocketMaker from './pages/DocketMaker.jsx'
import InvoiceHome from './pages/InvoiceHome.jsx'
import NewInvoice from './pages/invoice/InvoiceForm.jsx'
import EditInvoice from './pages/invoice/EditInvoiceForm.jsx'
import ViewInvoice from './pages/InvoiceList.jsx'
import SalesRecord from './pages/invoice/SalesRecord.jsx'

const { Header, Content } = Layout

export default function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 20px', background: 'transparent' }}>
        <PageHeader />
      </Header>
      <Content>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} /> {/* Fallback route */}
          <Route path="/docket" element={<DocketMaker />} />
          <Route path="/InvoiceHome" element={<InvoiceHome />} />
          <Route path="/new-invoice" element={<NewInvoice mode="new"/>} />
          <Route path="/edit-invoice/:id" element={<EditInvoice />} />
          <Route path="/view-invoice" element={<ViewInvoice />} />
          <Route path="/sales-invoices" element={<SalesRecord />} />
        </Routes>
      </Content>
    </Layout>
  )
}