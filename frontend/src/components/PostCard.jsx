/**
 * PostCard — a single post item in the review feed.
 *
 * Design intent: each card is a focused unit sitting over the blob layer
 * with purposeful glassmorphism (backdrop-blur + translucent bg). No side-stripe
 * borders. The relevance badge is a gentle ambient signal, not an alert. Cards
 * hover with a soft lift rather than a color change.
 */

import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Music2,
  Camera,
  FlaskConical,
  Globe,
  Clock,
  ChevronUp,
  MessageCircle,
} from 'lucide-react'

const PLATFORM_META = {
  reddit:    { icon: MessageSquare, label: 'Reddit',    color: 'text-[oklch(62%_0.12_25)]' },
  tiktok:    { icon: Music2,        label: 'TikTok',    color: 'text-cream-700' },
  instagram: { icon: Camera,        label: 'Instagram', color: 'text-[oklch(60%_0.10_330)]' },
  mock:      { icon: FlaskConical,  label: 'Mock',      color: 'text-cream-500' },
}

function PlatformIcon({ platform, className = '' }) {
  const meta = PLATFORM_META[platform] ?? { icon: Globe, color: 'text-cream-500' }
  const Icon = meta.icon
  return <Icon size={14} className={`${meta.color} ${className}`} strokeWidth={1.8} />
}

function RelevanceBadge({ score }) {
  if (score == null) return null

  let bgText
  if (score >= 0.7) {
    bgText = 'bg-safe-bg text-safe-text'
  } else if (score >= 0.4) {
    bgText = 'bg-flagged-bg text-flagged-text'
  } else {
    bgText = 'bg-cream-200 text-cream-600'
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-xs font-medium ${bgText}`}>
      {score.toFixed(2)} relevance
    </span>
  )
}

function SafetyBadge({ status }) {
  if (!status || status === 'pending') return null
  const map = {
    safe:    { cls: 'badge-safe',    label: 'Safe' },
    flagged: { cls: 'badge-flagged', label: 'Flagged' },
    blocked: { cls: 'badge-blocked', label: 'Blocked' },
  }
  const { cls, label } = map[status] ?? map.safe
  return <span className={cls}>{label}</span>
}

function StatusChip({ status }) {
  const map = {
    pending:  { label: 'Pending',  cls: 'bg-cream-200 text-cream-600' },
    reviewed: { label: 'Reviewed', cls: 'bg-safe-bg text-safe-text' },
    skipped:  { label: 'Skipped',  cls: 'bg-cream-200 text-cream-500' },
  }
  const { label, cls } = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)  return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PostCard({ post }) {
  const navigate = useNavigate()
  const meta = PLATFORM_META[post.platform] ?? {}
  const source = post.subreddit ? `r/${post.subreddit}` : (post.author ? `@${post.author}` : post.platform)

  return (
    <article
      onClick={() => navigate(`/posts/${post.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/posts/${post.id}`)}
      className={[
        'group relative rounded-xl bg-white/65 backdrop-blur-sm border border-cream-200',
        'px-5 py-4 cursor-pointer',
        'shadow-card hover:shadow-lg hover:-translate-y-px',
        'transition-all duration-200 ease-sonia',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-900 focus-visible:ring-offset-2',
        post.safety_status === 'blocked' ? 'opacity-75' : '',
      ].join(' ')}
    >
      {/* Meta row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <PlatformIcon platform={post.platform} />
          <span className="text-xs font-medium text-cream-700 truncate">{source}</span>
          {post.author && post.subreddit && (
            <span className="text-xs text-cream-400 truncate hidden sm:inline">
              u/{post.author}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-xs text-cream-400">
          <Clock size={11} strokeWidth={1.8} />
          <span>{relativeTime(post.created_at)}</span>
        </div>
      </div>

      {/* Title + body */}
      <div className="mb-3.5">
        {post.title && (
          <h3 className="font-serif text-base text-cream-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-cream-800 transition-colors">
            {post.title}
          </h3>
        )}
        <p className="text-sm text-cream-600 line-clamp-3 leading-relaxed">
          {post.body}
        </p>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <RelevanceBadge score={post.relevance_score} />
          <SafetyBadge status={post.safety_status} />
          <StatusChip status={post.status} />
        </div>

        {(post.upvotes > 0 || post.comment_count > 0) && (
          <div className="flex items-center gap-3 text-xs text-cream-400">
            {post.upvotes > 0 && (
              <span className="flex items-center gap-1">
                <ChevronUp size={12} strokeWidth={2} />
                {post.upvotes.toLocaleString()}
              </span>
            )}
            {post.comment_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle size={11} strokeWidth={1.8} />
                {post.comment_count.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
