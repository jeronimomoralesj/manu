'use client'
import { Heart } from 'lucide-react'
import { MoodMode } from '@/types'

interface Props {
  photoUrl: string | null
  message: string
  notePrefix: string
  mood: MoodMode
}

const MOOD_BG: Record<MoodMode, string> = {
  cozy_comfort: 'from-amber-50 to-orange-50',
  playful_connection: 'from-rose-50 to-pink-50',
  missing_you: 'from-blue-50 to-indigo-50',
  wind_down: 'from-violet-50 to-purple-50',
}

export default function PolaroidCard({ photoUrl, message, notePrefix, mood }: Props) {
  return (
    <div className="flex gap-4 items-start">
      {/* Polaroid photo */}
      <div
        className="flex-shrink-0 w-28 p-2 pb-6 shadow-lg rotate-[-2deg] hover:rotate-0 transition-transform duration-300"
        style={{ background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
      >
        <div className="w-full aspect-square bg-gray-100 overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} alt="Us" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center">
              <Heart className="w-10 h-10 text-rose-400 fill-rose-200" />
            </div>
          )}
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2 font-light italic">us ♡</p>
      </div>

      {/* Message bubble */}
      <div className={`flex-1 bg-gradient-to-br ${MOOD_BG[mood]} rounded-2xl p-4 relative`}
        style={{ boxShadow: '4px 4px 16px rgba(0,0,0,0.06), -2px -2px 8px rgba(255,255,255,0.8)' }}
      >
        <div className="absolute left-[-8px] top-6 w-4 h-4 rotate-45 bg-amber-50" />
        <p className="text-xs font-semibold text-[#FF5722] mb-1">{notePrefix}</p>
        <p className="text-sm text-gray-700 leading-relaxed italic">"{message}"</p>
        <div className="mt-3 flex items-center gap-1">
          {[1, 2, 3].map((i) => (
            <Heart key={i} className="w-3 h-3 text-[#FF5722] fill-[#FF5722]" />
          ))}
        </div>
      </div>
    </div>
  )
}
