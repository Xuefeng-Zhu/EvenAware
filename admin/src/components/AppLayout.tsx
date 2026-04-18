import { Outlet, NavLink, useLocation } from 'react-router'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/integrations', label: 'Integrations' },
]

export default function AppLayout() {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 flex flex-col bg-white border-r border-gray-200">
        {/* Logo / App title */}
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Notification Hub</h1>
          <p className="text-xs text-gray-500 mt-0.5">Admin</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive(item.to)
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <Outlet />
      </main>
    </div>
  )
}
