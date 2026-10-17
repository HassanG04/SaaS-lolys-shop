import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AdminHeader } from './AdminHeader'
import { AdminSidebar } from './AdminSidebar'
import { AdminRoutes } from './AdminRoutes'

export default function AdminShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const location = useLocation()
  const mainRef = useRef<HTMLDivElement>(null)

  // Reset inner scroll container on pathname change (not on search param changes)
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
  }, [location.pathname])

  return (
    <div className="admin-workspace h-dvh min-h-0 overflow-hidden flex bg-bg text-text font-sans antialiased">
      {/* Sidebar Rail */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        desktopCollapsed={desktopCollapsed}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Admin Column */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <AdminHeader
          isSidebarOpen={isSidebarOpen}
          desktopCollapsed={desktopCollapsed}
          onToggleDesktopSidebar={() => setDesktopCollapsed((prev) => !prev)}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        <div
          ref={mainRef}
          id="admin-main"
          tabIndex={-1}
          className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 overflow-y-auto focus:outline-none"
        >
          <div key={location.pathname} className="admin-page-transition">
            <AdminRoutes />
          </div>
        </div>
      </div>
    </div>
  )
}
