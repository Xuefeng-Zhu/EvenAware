import { Routes, Route } from 'react-router'
import { ToastProvider } from './contexts/ToastContext'
import ToastContainer from './components/ToastContainer'
import AppLayout from './components/AppLayout'
import DashboardPage from './pages/DashboardPage'
import IntegrationsPage from './pages/IntegrationsPage'
import IntegrationDetailPage from './pages/IntegrationDetailPage'

export default function App() {
  return (
    <ToastProvider>
      <ToastContainer />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/integrations/:id" element={<IntegrationDetailPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
