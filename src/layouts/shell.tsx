import { DrawerShell } from 'even-toolkit/web'
import type { SideDrawerItem } from 'even-toolkit/web'

const MENU_ITEMS: SideDrawerItem[] = [
  { id: '/', label: 'Notifications', section: 'Dashboard' },
]

const BOTTOM_ITEMS: SideDrawerItem[] = [
  { id: '/settings', label: 'Settings', section: 'App' },
]

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Notification Hub'
  if (pathname === '/settings') return 'Settings'
  return 'Notification Hub'
}

function deriveActiveId(pathname: string): string {
  if (pathname === '/settings') return '/settings'
  return '/'
}

export function Shell() {
  return (
    <DrawerShell
      items={MENU_ITEMS}
      bottomItems={BOTTOM_ITEMS}
      title="Notification Hub"
      getPageTitle={getPageTitle}
      deriveActiveId={deriveActiveId}
    />
  )
}
