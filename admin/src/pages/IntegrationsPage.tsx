import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { integrationService } from '../services/integrationService'
import { useToast } from '../contexts/ToastContext'
import type { Integration, CreateIntegrationInput } from '../types/integration'

/** Map source type to a display-friendly badge style. */
const sourceTypeBadgeStyles: Record<string, string> = {
  pagerduty: 'bg-green-100 text-green-800',
  opsgenie: 'bg-purple-100 text-purple-800',
  custom: 'bg-gray-100 text-gray-800',
}

export default function IntegrationsPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [sourceType, setSourceType] = useState<CreateIntegrationInput['sourceType']>('pagerduty')
  const [description, setDescription] = useState('')
  const [displayNameError, setDisplayNameError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Credentials state (shown after successful creation)
  const [createdCredentials, setCreatedCredentials] = useState<{
    webhookUrl: string
    authToken: string
  } | null>(null)

  useEffect(() => {
    const unsubscribe = integrationService.subscribe((data) => {
      setIntegrations(data)
    })

    return unsubscribe
  }, [])

  function resetForm() {
    setDisplayName('')
    setSourceType('pagerduty')
    setDescription('')
    setDisplayNameError('')
    setCreatedCredentials(null)
  }

  function handleCloseForm() {
    setShowCreateForm(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDisplayNameError('')

    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setDisplayNameError('Display name is required.')
      return
    }

    setSubmitting(true)
    try {
      const created = await integrationService.create({
        displayName: trimmedName,
        sourceType,
        description: description.trim() || undefined,
      })
      showSuccess(`Integration "${created.displayName}" created successfully.`)
      setCreatedCredentials({
        webhookUrl: created.webhookUrl,
        authToken: created.authToken,
      })
    } catch {
      showError('Failed to create integration. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess(`${label} copied to clipboard.`)
    } catch {
      showError(`Failed to copy ${label.toLowerCase()}.`)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create Integration
        </button>
      </div>

      {/* Create integration form */}
      {showCreateForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm p-6">
          {createdCredentials ? (
            /* Credentials panel — shown after successful creation */
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Integration Created</h2>
              <p className="text-sm text-gray-500 mb-4">
                Save these credentials now. The auth token will not be shown again.
              </p>

              <div className="space-y-4">
                {/* Webhook URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 break-all">
                      {createdCredentials.webhookUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdCredentials.webhookUrl, 'Webhook URL')}
                      className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Auth Token */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auth Token</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 break-all">
                      {createdCredentials.authToken}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdCredentials.authToken, 'Auth Token')}
                      className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Creation form */
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Integration</h2>

              <div className="space-y-4">
                {/* Display Name */}
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value)
                      if (displayNameError) setDisplayNameError('')
                    }}
                    className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                      displayNameError
                        ? 'border-red-300 text-red-900 placeholder-red-300'
                        : 'border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder="e.g., PagerDuty Production"
                  />
                  {displayNameError && (
                    <p className="mt-1 text-sm text-red-600">{displayNameError}</p>
                  )}
                </div>

                {/* Source Type */}
                <div>
                  <label htmlFor="sourceType" className="block text-sm font-medium text-gray-700 mb-1">
                    Source Type
                  </label>
                  <select
                    id="sourceType"
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as CreateIntegrationInput['sourceType'])}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  >
                    <option value="pagerduty">PagerDuty</option>
                    <option value="opsgenie">OpsGenie</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    placeholder="Optional description for this integration"
                  />
                </div>
              </div>

              {/* Form actions */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={submitting}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Integration list or empty state */}
      {integrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16 px-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 1 1 6.364 6.364l-1.757 1.757"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">No integrations configured</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new integration.</p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create Integration
          </button>
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {integrations.map((integration) => (
            <li
              key={integration.id}
              className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/integrations/${integration.id}`)}
            >
              <div className="flex items-center gap-4 px-4 py-4">
                {/* Enabled/disabled status indicator */}
                <span
                  className={`inline-block h-3 w-3 flex-shrink-0 rounded-full ${
                    integration.enabled ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  aria-label={integration.enabled ? 'Enabled' : 'Disabled'}
                  role="img"
                />

                {/* Main content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {integration.displayName}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {/* Source type badge */}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        sourceTypeBadgeStyles[integration.sourceType] ?? 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {integration.sourceType}
                    </span>
                    {/* Enabled/disabled text badge */}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        integration.enabled
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {integration.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* Creation timestamp */}
                <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(integration.createdAt.seconds * 1000).toLocaleDateString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
