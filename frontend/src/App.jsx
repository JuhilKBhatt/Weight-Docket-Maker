// frontend/src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from 'antd' // Removed Flex
import PageHeader from './components/PageHeader.jsx'

// Importing components for different routes
import Home from './pages/Home.jsx'
import Settings from './pages/Settings.jsx'

import InvoiceHome from './pages/InvoiceHome.jsx'
import NewInvoice from './pages/invoice/InvoiceForm.jsx'
import EditInvoice from './pages/invoice/EditInvoiceForm.jsx'
import ViewInvoice from './pages/invoice/InvoiceList.jsx'
import SalesRecord from './pages/invoice/SalesRecord.jsx'

import DocketHome from './pages/DocketHome.jsx'
import NewDocket from './pages/docket/DocketForm.jsx'
import ViewDocket from './pages/docket/DocketList'

const { Header, Content } = Layout

export default function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content>
        <Header style={{ display: 'flex', alignItems: 'center', padding: '0 20px', background: 'transparent' }}>
          <PageHeader />
        </Header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} /> {/* Fallback route */}
          <Route path="/settings" element={<Settings />} />

          <Route path="/InvoiceHome" element={<InvoiceHome />} />
          <Route path="/new-invoice" element={<NewInvoice mode="new"/>} />
          <Route path="/edit-invoice/:id" element={<EditInvoice />} />
          <Route path="/view-invoice" element={<ViewInvoice />} />
          <Route path="/sales-invoices" element={<SalesRecord />} />

          <Route path="/DocketHome" element={<DocketHome />} />
          <Route path="/new-docket" element={<NewDocket mode="new"/>} />
          <Route path="/view-docket" element={<ViewDocket />} />
        </Routes>
      </Content>
    </Layout>
  )
}