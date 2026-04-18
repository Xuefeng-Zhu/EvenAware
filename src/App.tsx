import { Routes, Route } from 'react-router'
import { Shell } from './layouts/shell'
import { AppGlasses } from './glass/AppGlasses'
import { Settings } from './pages/Settings'
import { Home } from './pages/Home'

export function App() {
  return (
    <>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <AppGlasses />
    </>
  )
}
