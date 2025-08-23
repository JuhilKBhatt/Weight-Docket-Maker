// frontend/src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'

// Importing components for different routes
import Home from './pages/Home.jsx'
import DocketMaker from './pages/DocketMaker.jsx'
import InvoiceHome from './pages/InvoiceHome.jsx'
import NewInvoice from './pages/NewInvoiceForm.jsx'
import EditInvoice from './pages/EditInvoiceForm.jsx'
import ViewInvoice from './pages/InvoiceList.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Home />} /> {/* Fallback route */}
      <Route path="/docket" element={<DocketMaker />} />
      <Route path="/InvoiceHome" element={<InvoiceHome />} />
      <Route path="/new-invoice" element={<NewInvoice />} />
      <Route path="/edit-invoice" element={<EditInvoice />} />
      <Route path="/view-invoice" element={<ViewInvoice />} />
    </Routes>
  )
}