import { useState, useEffect, useCallback } from 'react'
import {
  AppShell,
  NavHeader,
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
    try {
      await navigator.clipboard.writeText(text)
      setCopiedType(sourceType)
      setTimeout(() => setCopiedType(null), 2000)
    } catch {
      console.warn('[Settings] Clipboard API not available')
    }
  }, [])

  return (
    <AppShell header={<NavHeader title="Notification Hub" />}>
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
    </AppShell>
  )
}
