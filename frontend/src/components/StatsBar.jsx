/**
 * StatsBar — five aggregate metrics drawn from /api/stats.
 *
 * Design intent: a single horizontal reading, not a grid of hero-metric tiles.
 * Each stat reads as a sentence fragment; numbers lead but are not giant.
 * Organic tinted-dot dividers replace hard lines.
 */

function StatDot() {
  return (
    <div className="flex flex-col items-center gap-[3px] self-center px-1" aria-hidden="true">
      <span className="w-[3px] h-[3px] rounded-full bg-cream-400" />
      <span className="w-[3px] h-[3px] rounded-full bg-cream-300" />
      <span className="w-[3px] h-[3px] rounded-full bg-cream-400" />
    </div>
  )
}

function Stat({ value, label, color = 'text-cream-900' }) {
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className={`text-lg font-semibold tabular-nums leading-none ${color}`}>
        {value ?? '—'}
      </span>
      <span className="text-sm text-cream-500 whitespace-nowrap">{label}</span>
    </div>
  )
}

export default function StatsBar({ stats, loading }) {
  if (loading) {
    return (
      <div className="w-full rounded-xl bg-white/60 backdrop-blur-sm border border-cream-200 px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          {[80, 64, 72, 56, 68].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <StatDot />}
              <div
                className="h-4 rounded-md bg-cream-200 animate-pulse"
                style={{ width: `${w}px`, animationDelay: `${i * 0.08}s` }}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const approvalPct =
    stats.approval_rate != null
      ? `${Math.round(stats.approval_rate * 100)}%`
      : '—'

  const relevance =
    stats.avg_relevance_score != null
      ? stats.avg_relevance_score.toFixed(2)
      : '—'

  return (
    <div className="w-full rounded-xl bg-white/60 backdrop-blur-sm border border-cream-200 px-6 py-4">
      <div className="flex items-center gap-1 flex-wrap">
        <Stat value={stats.total_posts} label="posts" />
        <StatDot />
        <Stat
          value={stats.status?.pending ?? 0}
          label="pending"
          color="text-flagged-text"
        />
        <StatDot />
        <Stat
          value={stats.status?.reviewed ?? 0}
          label="reviewed"
          color="text-safe-text"
        />
        <StatDot />
        <Stat value={approvalPct} label="approval rate" />
        <StatDot />
        <Stat value={relevance} label="avg relevance" />
      </div>
    </div>
  )
}
