import { useEffect, useState } from 'react'
import { X, Zap } from 'lucide-react'
import api from '../../lib/api'

const DISMISSED_KEY = 'nvx_dismissed_announcements'

/**
 * UrgentAnnouncementPopup
 * Fetches urgent announcements and shows a dismissable modal.
 * Dismissed IDs are persisted in localStorage so they don't reappear.
 */
export default function UrgentAnnouncementPopup() {
  const [announcement, setAnnouncement] = useState(null)

  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')

    api.get('/announcements/urgent')
      .then(({ data }) => {
        const unseen = (data.announcements || []).find((a) => !dismissed.includes(a.id))
        if (unseen) setAnnouncement(unseen)
      })
      .catch(() => {}) // Silent fail — popup is non-critical
  }, [])

  const dismiss = () => {
    if (!announcement) return
    const dismissed = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed, announcement.id]))
    setAnnouncement(null)
  }

  if (!announcement) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-400/30 bg-[#0d1526] shadow-2xl overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-red-500 to-orange-500" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-400/15 border border-red-400/30 flex items-center justify-center">
                <Zap size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Urgent Notice</p>
                <p className="text-xs text-slate-500">{new Date(announcement.published_at).toLocaleString()}</p>
              </div>
            </div>
            <button onClick={dismiss} className="text-slate-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <h2 className="text-lg font-bold mb-3">{announcement.title}</h2>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{announcement.body}</p>

          <button
            onClick={dismiss}
            className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            I Understand — Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
