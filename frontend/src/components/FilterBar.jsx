/**
 * FilterBar — platform pills, safety tabs, status filter, and free-text search.
 *
 * Design intent: the active pill uses the cream-900 dark background to
 * communicate selection weight without color shouting. Inactive pills are
 * ghost-style. Safety tabs follow the same pill pattern with their semantic
 * tint applied only to the active state. The Review Status filter uses an
 * inline-expanding pill group: it collapses to a single pill and slides open
 * horizontally to expose all options — no vertical popover, no dropdown.
 */

import { useState } from 'react'
import { Search, X, ClipboardList, ChevronRight } from 'lucide-react'

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

const STATUSES = [
  { id: 'all',      label: 'All' },
  { id: 'pending',  label: 'Pending' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'skipped',  label: 'Skipped' },
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

/**
 * Inline-expanding Review Status pill group.
 *
 * Collapsed: single pill anchored in the flex row.
 * Expanded: options float out absolutely (left: 100%) so the layout never
 * reflows during the animation. Only opacity + translateX are animated —
 * both paint-only properties — keeping the rest of the page perfectly still.
 */
function StatusFilter({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const current = STATUSES.find((s) => s.id === value) ?? STATUSES[1]

  function select(id) {
    onChange(id)
    setOpen(false)
  }

  const isActive = value !== 'all'

  return (
    <div className="relative flex items-center">
      {/* Trigger pill — stable in flow; visual state reflects active/open */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={[
          'flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-sm font-medium whitespace-nowrap',
          'transition-all duration-200 focus-visible:ring-2 focus-visible:ring-cream-900 focus-visible:ring-offset-1',
          open
            ? 'bg-cream-100 text-cream-800 border border-cream-300'
            : isActive
              ? 'bg-cream-900 text-cream-50 shadow-sm'
              : 'bg-white/70 text-cream-600 border border-cream-200 hover:border-cream-400 hover:text-cream-900 hover:bg-white',
        ].join(' ')}
      >
        <ClipboardList size={13} strokeWidth={2} />
        <span>
          {open || !isActive ? 'Status' : `Status: ${current.label}`}
        </span>
        <ChevronRight
          size={12}
          strokeWidth={2.5}
          className={`transition-transform duration-300 ease-in-out ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {/*
        Options panel — absolutely positioned off the trigger's right edge.
        Out of flow = zero layout reflow. Only opacity + translate animate,
        so the surrounding flex row and page content never move.
      */}
      <div
        className={[
          'absolute left-full top-1/2 -translate-y-1/2 flex items-center gap-1 pl-1.5',
          'transition-[opacity,transform] duration-300 ease-in-out',
          open
            ? 'opacity-100 translate-x-0 pointer-events-auto'
            : 'opacity-0 -translate-x-2 pointer-events-none',
        ].join(' ')}
      >
        {STATUSES.map((s) => (
          <button
            key={s.id}
            onClick={() => select(s.id)}
            className={[
              'whitespace-nowrap px-3 py-1.5 rounded-pill text-sm font-medium',
              'transition-all duration-150 focus-visible:ring-2 focus-visible:ring-cream-900 focus-visible:ring-offset-1',
              s.id === value
                ? 'bg-cream-200 text-cream-900'
                : 'bg-white/90 text-cream-600 hover:bg-white hover:text-cream-900',
            ].join(' ')}
          >
            {s.label}
          </button>
        ))}

        <button
          onClick={() => setOpen(false)}
          aria-label="Collapse status filter"
          className="ml-0.5 p-1.5 rounded-full text-cream-400 hover:text-cream-700 hover:bg-cream-100 transition-colors duration-150"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

export default function FilterBar({ filters, onChange, statusFilter, setStatusFilter }) {
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

        <span className="mx-1 self-center text-cream-300 select-none" aria-hidden="true">
          ·
        </span>

        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
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
