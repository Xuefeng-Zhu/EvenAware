import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

function mapFirebaseError(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    const code = (error as { code: string }).code
    switch (code) {
      case 'auth/invalid-credential':
        return 'Invalid email or password.'
      case 'auth/user-disabled':
        return 'This account has been disabled.'
      case 'auth/too-many-requests':
        return 'Too many sign-in attempts. Please try again later.'
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.'
      default:
        return 'Sign-in failed. Please try again.'
    }
  }
  return 'Sign-in failed. Please try again.'
}

export default function SignInPage() {
  const { user, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signIn(email, password)
      // On success, onAuthStateChanged updates `user`, triggering the Navigate above
    } catch (err) {
      setError(mapFirebaseError(err))
      // Clear password but retain email so the user can retry
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-center text-gray-900 mb-6">
          Admin Sign In
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
