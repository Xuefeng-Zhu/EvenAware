import { useState, useEffect, useCallback } from 'react'
import {
  ScreenHeader,
  Card,
  ListItem,
  Button,
  SectionHeader,
  StatusDot,
} from 'even-toolkit/web'
import { notificationStore } from '@/store/notificationStore'

/** Configured webhook sources with their Cloud Functions URLs */
const WEBHOOK_SOURCES = [
  {
    type: 'pagerduty',
    name: 'PagerDuty',
    webhookUrl: `${import.meta.env.VITE_FUNCTIONS_URL || 'https://your-project.cloudfunctions.net'}/handleWebhook/webhooks/pagerduty`,
  },
  {
    type: 'opsgenie',
    name: 'OpsGenie',
    webhookUrl: `${import.meta.env.VITE_FUNCTIONS_URL || 'https://your-project.cloudfunctions.net'}/handleWebhook/webhooks/opsgenie`,
  },
]

export function Settings() {
  const [isConnected, setIsConnected] = useState(notificationStore.isConnected)
  const [copiedType, setCopiedType] = useState<string | null>(null)

  useEffect(() => {
    const unsub = notificationStore.onChange(() => {
      setIsConnected(notificationStore.isConnected)
    })
    return unsub
  }, [])

  const copyToClipboard = useCallback(async (text: string, sourceType: string) => {
    let success = false

    // Try the modern Clipboard API first (requires secure context)
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        success = true
      } catch {
        // Falls through to legacy fallback
      }
    }

    // Legacy fallback for non-secure contexts (e.g. http://127.0.0.1)
    if (!success) {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        success = document.execCommand('copy')
        document.body.removeChild(textarea)
      } catch {
        console.warn('[Settings] Clipboard copy failed')
      }
    }

    if (success) {
      setCopiedType(sourceType)
      setTimeout(() => setCopiedType(null), 2000)
    }
  }, [])

  return (
    <div className="px-3 pt-4 pb-8 space-y-3">
      <ScreenHeader title="Settings" />

      {/* Connection Status */}
      <Card>
        <ListItem
          title="Firestore Connection"
          subtitle={isConnected ? 'Connected' : 'Disconnected'}
          trailing={<StatusDot connected={isConnected} />}
        />
      </Card>

      {/* Configured Webhook Sources */}
      <SectionHeader title="Webhook Sources" />
      <Card>
        {WEBHOOK_SOURCES.map((source) => (
          <ListItem
            key={source.type}
            title={source.name}
            subtitle={source.webhookUrl}
            trailing={
              <Button
                size="sm"
                variant="highlight"
                onClick={() => copyToClipboard(source.webhookUrl, source.type)}
              >
                {copiedType === source.type ? 'Copied' : 'Copy'}
              </Button>
            }
          />
        ))}
      </Card>
    </div>
  )
}
