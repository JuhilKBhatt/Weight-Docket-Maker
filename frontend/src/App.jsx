// frontend/src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'

// Importing components for different routes
import Home from './pages/Home.jsx'
import DocketMaker from './pages/DocketMaker.jsx'
import InvoiceMaker from './pages/InvoiceMaker.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/docket" element={<DocketMaker />} />
      <Route path="/invoice" element={<InvoiceMaker />} />
    </Routes>
  )
}