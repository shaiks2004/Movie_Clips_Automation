import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import SuperAdmin from './pages/SuperAdmin.jsx'

function App() {
  return (
    <div className="app-container">
      <div className="pulse-glow-bg"></div>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tool" element={<Dashboard />} />
        {/* Support all sub-admin pages matching backend routing */}
        <Route path="/admin" element={<SuperAdmin />} />
        <Route path="/admin/*" element={<SuperAdmin />} />
        <Route path="*" element={<div style={{ padding: '40px', textAlign: 'center' }}><h2>404 — Page Not Found</h2></div>} />
      </Routes>
    </div>
  )
}

export default App
