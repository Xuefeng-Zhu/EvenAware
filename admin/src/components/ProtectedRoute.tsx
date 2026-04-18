import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />
  }

  return <Outlet />
}
