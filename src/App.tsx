import { Routes, Route, useNavigate } from 'react-router'
import { AppShell, NavHeader, ScreenHeader, Card, Button, ListItem } from 'even-toolkit/web'
import { AppGlasses } from './glass/AppGlasses'
import { Settings } from './pages/Settings'

function Home() {
  const navigate = useNavigate()
  return (
    <AppShell header={<NavHeader title="Notification Hub" />}>
      <div className="px-3 pt-4 pb-8 space-y-3">
        <ScreenHeader
          title="Notification Hub"
          subtitle="Real-time notification aggregation for G2 glasses"
        />
        <Card>
          <ListItem
            title="Settings"
            subtitle="Manage sources and view connection status"
            trailing={<Button size="sm" variant="highlight" onClick={() => navigate('/settings')}>Open</Button>}
          />
        </Card>
      </div>
    </AppShell>
  )
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/settings" element={<Settings />} />
        <Route path="/*" element={<Home />} />
      </Routes>
      <AppGlasses />
    </>
  )
}
