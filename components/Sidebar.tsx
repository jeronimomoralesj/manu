'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Music2, Sparkles, Archive, HelpCircle, MapPin, Mail } from 'lucide-react'

const ACCENT = '#FF5722'

const TABS = [
  { href: '/', icon: Music2, label: 'Música' },
  { href: '/vibe', icon: Sparkles, label: 'Vibes' },
  { href: '/vault', icon: Archive, label: 'Recuerdos' },
  { href: '/cartas', icon: Mail, label: 'Cartas' },
  { href: '/trivia', icon: HelpCircle, label: 'Trivia' },
  { href: '/map', icon: MapPin, label: 'Mapa' },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {/* Desktop: left vertical icon bar */}
      <aside
        className="hidden md:flex flex-col items-center py-6 gap-2 flex-shrink-0 h-full"
        style={{
          width: 68,
          background: '#111111',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold mb-4 flex-shrink-0"
          style={{ background: ACCENT }}
        >
          ♪
        </div>

        {TABS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className="relative group flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all"
              style={active
                ? { background: `${ACCENT}18`, color: ACCENT }
                : { color: 'rgba(255,255,255,0.35)' }
              }
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                  style={{ background: ACCENT }}
                />
              )}
              {/* Tooltip */}
              <span
                className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs font-semibold text-white whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </aside>

      {/* Mobile: bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 px-1"
        style={{
          background: '#111111',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all"
              style={{ color: active ? ACCENT : 'rgba(255,255,255,0.35)' }}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[9px] font-semibold">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
