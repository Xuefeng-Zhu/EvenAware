import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { integrationService } from '../services/integrationService'
import { useToast } from '../contexts/ToastContext'
import type { Integration } from '../types/integration'

/** Map source type to a display-friendly badge style. */
const sourceTypeBadgeStyles: Record<string, string> = {
  pagerduty: 'bg-green-100 text-green-800',
  opsgenie: 'bg-purple-100 text-purple-800',
  custom: 'bg-gray-100 text-gray-800',
}

export default function IntegrationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  // Integration data from subscription
  const [integration, setIntegration] = useState<Integration | null>(null)
  const [loading, setLoading] = useState(true)

  // Token visibility
  const [showToken, setShowToken] = useState(false)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Confirmation dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    const unsubscribe = integrationService.subscribe((integrations) => {
      const found = integrations.find((i) => i.id === id) ?? null
      setIntegration(found)
      setLoading(false)
    })

    return unsubscribe
  }, [id])

  // Sync edit form state when integration changes or edit mode is entered
  useEffect(() => {
    if (integration && editing) {
      setEditDisplayName(integration.displayName)
      setEditDescription(integration.description)
    }
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCopy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess(`${label} copied to clipboard.`)
    } catch {
      showError(`Failed to copy ${label.toLowerCase()}.`)
    }
  }

  async function handleSaveEdit() {
    if (!integration || !id) return

    const trimmedName = editDisplayName.trim()
    if (!trimmedName) {
      showError('Display name cannot be empty.')
      return
    }

    setSaving(true)
    try {
      await integrationService.update(id, {
        displayName: trimmedName,
        description: editDescription.trim(),
      })
      showSuccess('Integration updated successfully.')
      setEditing(false)
    } catch {
      showError('Failed to update integration. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleEnabled() {
    if (!integration || !id) return

    try {
      await integrationService.update(id, { enabled: !integration.enabled })
      showSuccess(
        integration.enabled
          ? 'Integration disabled.'
          : 'Integration enabled.'
      )
    } catch {
      showError('Failed to update integration status. Please try again.')
    }
  }

  async function handleRegenerateToken() {
    if (!id) return

    setRegenerating(true)
    try {
      await integrationService.regenerateToken(id)
      showSuccess('Auth token regenerated successfully.')
      setShowToken(true)
      setShowRegenerateConfirm(false)
    } catch {
      showError('Failed to regenerate token. Please try again.')
    } finally {
      setRegenerating(false)
    }
  }

  async function handleDelete() {
    if (!id) return

    setDeleting(true)
    try {
      await integrationService.delete(id)
      showSuccess('Integration deleted successfully.')
      navigate('/integrations')
    } catch {
      showError('Failed to delete integration. Please try again.')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-sm text-gray-500">Loading integration…</p>
      </div>
    )
  }

  // Not found state
  if (!integration) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Integration Not Found</h1>
        <p className="text-sm text-gray-500 mb-4">
          The integration you are looking for does not exist or has been deleted.
        </p>
        <Link
          to="/integrations"
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          ← Back to Integrations
        </Link>
      </div>
    )
  }

  const maskedToken = '••••••••'
  const createdDate = new Date(integration.createdAt.seconds * 1000)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        to="/integrations"
        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 mb-6"
      >
        ← Back to Integrations
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              integration.enabled ? 'bg-green-500' : 'bg-gray-400'
            }`}
            aria-label={integration.enabled ? 'Enabled' : 'Disabled'}
            role="img"
          />
          <h1 className="text-2xl font-semibold text-gray-900">
            {integration.displayName}
          </h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              sourceTypeBadgeStyles[integration.sourceType] ?? 'bg-gray-100 text-gray-800'
            }`}
          >
            {integration.sourceType}
          </span>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Edit
          </button>
        )}
      </div>

      {/* Details card */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>

          {editing ? (
            /* Edit form */
            <div className="space-y-4">
              <div>
                <label htmlFor="editDisplayName" className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  id="editDisplayName"
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                />
              </div>
              <div>
                <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* View mode */
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Display Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{integration.displayName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Source Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{integration.sourceType}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {integration.description || <span className="text-gray-400 italic">No description</span>}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      integration.enabled
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {integration.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {createdDate.toLocaleString()}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      {/* Credentials card */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Credentials</h2>

          <div className="space-y-4">
            {/* Webhook URL */}
            <div>
              <dt className="text-sm font-medium text-gray-500 mb-1">Webhook URL</dt>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 break-all">
                  {integration.webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(integration.webhookUrl, 'Webhook URL')}
                  className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Auth Token */}
            <div>
              <dt className="text-sm font-medium text-gray-500 mb-1">Auth Token</dt>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 break-all">
                  {showToken ? integration.authToken : maskedToken}
                </code>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {showToken ? 'Hide' : 'Reveal'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(integration.authToken, 'Auth Token')}
                  className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions card */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* Enable/Disable toggle */}
            <button
              type="button"
              onClick={handleToggleEnabled}
              className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                integration.enabled
                  ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
                  : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
              }`}
            >
              {integration.enabled ? 'Disable Integration' : 'Enable Integration'}
            </button>

            {/* Regenerate token */}
            <button
              type="button"
              onClick={() => setShowRegenerateConfirm(true)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Regenerate Token
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone card */}
      <div className="rounded-lg border border-red-200 bg-white shadow-sm">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Deleting an integration is permanent and cannot be undone. The webhook URL and auth token will stop working immediately.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Delete Integration
          </button>
        </div>
      </div>

      {/* Regenerate token confirmation dialog */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Regenerate Auth Token?</h3>
            <p className="text-sm text-gray-500 mb-6">
              The previous token will stop working. Any external services using the current token will need to be updated with the new one. Are you sure?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                disabled={regenerating}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateToken}
                disabled={regenerating}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regenerating ? 'Regenerating…' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Integration?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Delete <strong>{integration.displayName}</strong>? This action is permanent and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
