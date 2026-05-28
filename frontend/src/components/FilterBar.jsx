/**
 * FilterBar — platform pills, safety tabs, and free-text search.
 *
 * Design intent: the active pill uses the cream-900 dark background to
 * communicate selection weight without color shouting. Inactive pills
 * are ghost-style. Safety tabs follow the same pill pattern with their
 * semantic tint applied only to the active state.
 */

import { Search, X } from 'lucide-react'

const PLATFORMS = [
  { id: 'all',       label: 'All' },
  { id: 'reddit',    label: 'Reddit' },
  { id: 'tiktok',    label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'mock',      label: 'Mock' },
]

const SAFETY = [
  { id: 'safe',    label: 'Safe' },
  { id: 'flagged', label: 'Flagged' },
  { id: 'blocked', label: 'Blocked' },
]

function PlatformPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3.5 py-1.5 rounded-pill text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-cream-900 focus-visible:ring-offset-1',
        active
          ? 'bg-cream-900 text-cream-50 shadow-sm'
          : 'bg-white/70 text-cream-600 border border-cream-200 hover:border-cream-400 hover:text-cream-900 hover:bg-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function SafetyPill({ id, active, onClick, children }) {
  const activeStyles = {
    safe:    'bg-safe-bg text-safe-text border-safe-ring/40',
    flagged: 'bg-flagged-bg text-flagged-text border-flagged-ring/40',
    blocked: 'bg-blocked-bg text-blocked-text border-blocked-ring/40',
  }

  return (
    <button
      onClick={onClick}
      className={[
        'px-3.5 py-1.5 rounded-pill text-sm font-medium border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-cream-900 focus-visible:ring-offset-1',
        active
          ? activeStyles[id]
          : 'bg-white/70 text-cream-500 border-cream-200 hover:border-cream-400 hover:text-cream-800 hover:bg-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export default function FilterBar({ filters, onChange }) {
  const { platform = 'all', safety_status = null, search = '' } = filters

  function setPlatform(p) {
    onChange({ ...filters, platform: p === 'all' ? 'all' : p })
  }

  function setSafety(s) {
    onChange({ ...filters, safety_status: safety_status === s ? null : s })
  }

  function setSearch(e) {
    onChange({ ...filters, search: e.target.value })
  }

  function clearSearch() {
    onChange({ ...filters, search: '' })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {PLATFORMS.map((p) => (
          <PlatformPill
            key={p.id}
            active={platform === p.id}
            onClick={() => setPlatform(p.id)}
          >
            {p.label}
          </PlatformPill>
        ))}

        <span className="mx-1 self-center text-cream-300 select-none" aria-hidden="true">
          ·
        </span>

        {SAFETY.map((s) => (
          <SafetyPill
            key={s.id}
            id={s.id}
            active={safety_status === s.id}
            onClick={() => setSafety(s.id)}
          >
            {s.label}
          </SafetyPill>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-400 pointer-events-none"
          size={15}
          strokeWidth={2}
        />
        <input
          type="text"
          value={search}
          onChange={setSearch}
          placeholder="Search posts..."
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/70 border border-cream-200 text-sm text-cream-900 placeholder:text-cream-400 focus:outline-none focus:border-cream-400 focus:bg-white transition-all duration-200"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cream-400 hover:text-cream-700 transition-colors"
            aria-label="Clear search"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  )
}
