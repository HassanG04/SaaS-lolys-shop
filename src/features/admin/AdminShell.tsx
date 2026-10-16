import { useState } from 'react'
import { AdminHeader } from './AdminHeader'
import { AdminSidebar } from './AdminSidebar'
import { AdminRoutes } from './AdminRoutes'

export default function AdminShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  return (
    <div className="min-h-screen flex lg:flex-row-reverse rtl:lg:flex-row bg-(--color-bg) text-(--color-text) font-sans antialiased">
      {/* Sidebar Rail */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        desktopCollapsed={desktopCollapsed}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Admin Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          isSidebarOpen={isSidebarOpen}
          desktopCollapsed={desktopCollapsed}
          onToggleDesktopSidebar={() => setDesktopCollapsed((prev) => !prev)}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto focus:outline-none"
        >
          <AdminRoutes />
        </main>
      </div>
    </div>
  )
}
