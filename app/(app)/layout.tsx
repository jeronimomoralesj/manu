import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#0a0a0a', fontFamily: "'Inter', sans-serif" }}
    >
      <Sidebar />
      {/* Content — pb-20 on mobile for bottom tab bar clearance */}
      <main className="flex-1 overflow-hidden flex flex-col pb-0 md:pb-0">
        {children}
      </main>
    </div>
  )
}
