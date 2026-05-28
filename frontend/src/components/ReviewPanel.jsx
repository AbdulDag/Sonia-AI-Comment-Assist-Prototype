/**
 * ReviewPanel — the full review workspace for a single mental health post.
 *
 * Scene: a clinical reviewer in a calm home office, reading carefully and
 * making fast, thoughtful decisions. The UI must feel spacious and warm,
 * not clinical or tense.
 *
 * Layout: two-column on lg+ (reading context left, workspace right — sticky).
 * Mobile: single column, workspace below.
 *
 * Keyboard shortcuts (active when no input is focused):
 *   A — Approve        R — Reject
 *   F — Flag Unsafe    E — Focus draft textarea
 *   Escape — Back to feed
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  PenLine,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  MessageSquare,
  Music2,
  Camera,
  FlaskConical,
  Globe,
  ChevronUp,
  MessageCircle,
  Loader2,
} from 'lucide-react'
import { generateDraft, submitReview, overrideSafety } from '../utils/api'

// ─── Static maps ─────────────────────────────────────────────────────────────

const PLATFORM_META = {
  reddit:    { Icon: MessageSquare, label: 'Reddit',    color: 'text-[oklch(62%_0.12_25)]' },
  tiktok:    { Icon: Music2,        label: 'TikTok',    color: 'text-cream-700' },
  instagram: { Icon: Camera,        label: 'Instagram', color: 'text-[oklch(60%_0.10_330)]' },
  mock:      { Icon: FlaskConical,  label: 'Mock',      color: 'text-cream-500' },
}

const DECISION_META = {
  approved:       { label: 'Approved',          cls: 'bg-safe-bg text-safe-text' },
  edited:         { label: 'Edited & Approved', cls: 'bg-safe-bg text-safe-text' },
  rejected:       { label: 'Rejected',          cls: 'bg-cream-200 text-cream-600' },
  flagged_unsafe: { label: 'Flagged Unsafe',    cls: 'bg-flagged-bg text-flagged-text' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function relevancePillClass(score) {
  if (score == null) return 'bg-cream-200 text-cream-500'
  if (score >= 0.7)  return 'bg-safe-bg text-safe-text'
  if (score >= 0.4)  return 'bg-flagged-bg text-flagged-text'
  return 'bg-cream-200 text-cream-600'
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

/** Tiny keyboard shortcut badge displayed next to button text. */
function KbdHint({ letter }) {
  return (
    <kbd
      aria-hidden="true"
      className={[
        'inline-flex items-center justify-center w-[18px] h-[18px]',
        'rounded text-[10px] font-mono shrink-0',
        'bg-white/20 border border-current/20 opacity-60',
      ].join(' ')}
    >
      {letter}
    </kbd>
  )
}

/** Animated placeholder shown while a draft is being generated. */
function DraftPulse() {
  return (
    <div
      className="min-h-[200px] rounded-lg bg-cream-50 border border-cream-200 px-5 py-4 space-y-3 animate-pulse"
      aria-label="Generating draft"
    >
      {[1, 0.83, 1, 0.73, 0.91, 0.62, 0.87].map((w, i) => (
        <div
          key={i}
          className="h-3 bg-cream-200 rounded"
          style={{ width: `${w * 100}%` }}
        />
      ))}
      <p className="text-xs text-cream-400 pt-2 flex items-center gap-1.5">
        <Loader2 size={11} strokeWidth={2} className="animate-spin" />
        Generating draft
      </p>
    </div>
  )
}

/** A single past review entry in the history list. */
function ReviewHistoryItem({ review }) {
  const meta = DECISION_META[review.decision] ?? { label: review.decision, cls: 'bg-cream-200 text-cream-600' }

  return (
    <li className="py-3 border-t border-cream-100 first:border-0">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-medium ${meta.cls}`}>
          {meta.label}
        </span>
        <span className="text-xs text-cream-400 shrink-0 tabular-nums">
          {relativeTime(review.reviewed_at)}
        </span>
      </div>

      {review.edited_text && (
        <p className="text-xs text-cream-600 mt-2 leading-relaxed line-clamp-3 italic pl-0.5">
          &ldquo;{review.edited_text}&rdquo;
        </p>
      )}

      {review.reviewer_notes && (
        <p className="text-xs text-cream-400 mt-1.5 pl-0.5">
          Note: {review.reviewer_notes}
        </p>
      )}
    </li>
  )
}

// ─── Action button ────────────────────────────────────────────────────────────

const ACTION_VARIANTS = {
  dark:    'bg-cream-900 text-cream-50 hover:bg-cream-800 focus-visible:ring-cream-900',
  darkAlt: 'bg-cream-800 text-cream-100 hover:bg-cream-700 focus-visible:ring-cream-800',
  ghost:   'border border-cream-300 text-cream-700 bg-transparent hover:bg-cream-100 hover:border-cream-400 focus-visible:ring-cream-700',
  warn:    'bg-flagged-bg text-flagged-text border border-flagged-ring/30 hover:bg-flagged-ring/20 focus-visible:ring-flagged-ring',
}

function ActionButton({ onClick, disabled, variant = 'ghost', children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative inline-flex items-center justify-center gap-2',
        'px-3 py-2.5 rounded-pill text-sm font-medium',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        ACTION_VARIANTS[variant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ─── ReviewPanel ─────────────────────────────────────────────────────────────

export default function ReviewPanel({ post, onComplete }) {
  const navigate = useNavigate()

  // Initialize draft from post's pre-existing drafts (latest version wins)
  const initialDraft = post.drafts?.length > 0
    ? post.drafts[post.drafts.length - 1]
    : null

  const [draft, setDraft]               = useState(initialDraft)
  const [draftText, setDraftText]       = useState(initialDraft?.draft_text ?? '')
  const [reviewerNotes, setReviewerNotes] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError]   = useState(null)
  const [historyOpen, setHistoryOpen]   = useState(false)

  const [steeringPrompt, setSteeringPrompt]       = useState('')
  const [safetyStatusLocal, setSafetyStatusLocal] = useState(post.safety_status)
  const [safetyPopoverOpen, setSafetyPopoverOpen] = useState(false)
  const [isSafetyOverriding, setIsSafetyOverriding] = useState(false)
  const [safetyOverrideError, setSafetyOverrideError] = useState(null)

  const textareaRef      = useRef(null)
  const handleActionRef  = useRef(null)
  const didAutoGenerate  = useRef(false)
  const safetyBadgeRef   = useRef(null)

  const isBlocked  = safetyStatusLocal === 'blocked'
  const isModified = draft != null && draftText !== draft.draft_text
  const platform   = PLATFORM_META[post.platform] ?? { Icon: Globe, label: post.platform, color: 'text-cream-500' }
  const source     = post.subreddit
    ? `r/${post.subreddit}`
    : post.author
      ? `@${post.author}`
      : post.platform

  // ── Auto-generate draft on first load if none exist and post is not blocked ──
  useEffect(() => {
    if (!didAutoGenerate.current && !initialDraft && !isBlocked) {
      didAutoGenerate.current = true
      setIsGenerating(true)
      generateDraft(post.id, { regenerate: false })
        .then((result) => {
          setDraft(result.draft)
          setDraftText(result.draft.draft_text)
        })
        .catch((err) => setGenerateError(err.message ?? 'Failed to generate draft.'))
        .finally(() => setIsGenerating(false))
    }
    // Intentionally empty: run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Submit a review decision ──────────────────────────────────────────────
  const handleAction = useCallback(
    async (decision) => {
      if (!draft || isSubmitting) return
      if (isBlocked && (decision === 'approved' || decision === 'edited')) return

      setIsSubmitting(true)
      setSubmitError(null)

      const payload = {
        draft_id: draft.id,
        decision,
        ...(reviewerNotes.trim() ? { reviewer_notes: reviewerNotes.trim() } : {}),
        ...(decision === 'edited'  ? { edited_text: draftText }               : {}),
      }

      try {
        await submitReview(post.id, payload)
        onComplete()
      } catch (err) {
        setSubmitError(err.message ?? 'Failed to submit. Please try again.')
        setIsSubmitting(false)
      }
    },
    [draft, draftText, reviewerNotes, isSubmitting, isBlocked, post.id, onComplete]
  )

  // Keep ref current so the keyboard effect always calls the latest closure
  handleActionRef.current = handleAction

  // ── Regenerate draft ──────────────────────────────────────────────────────
  async function handleGenerate() {
    if (isGenerating || isBlocked) return
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const options = {}
      if (steeringPrompt.trim()) options.steering_prompt = steeringPrompt.trim()
      const result = await generateDraft(post.id, options)
      setDraft(result.draft)
      setDraftText(result.draft.draft_text)
    } catch (err) {
      setGenerateError(err.message ?? 'Failed to generate draft.')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Manual safety override ────────────────────────────────────────────────
  async function handleSafetyOverride(newStatus) {
    setSafetyPopoverOpen(false)
    if (newStatus === safetyStatusLocal || isSafetyOverriding) return
    setIsSafetyOverriding(true)
    setSafetyOverrideError(null)
    try {
      await overrideSafety(post.id, newStatus)
      setSafetyStatusLocal(newStatus)
    } catch (err) {
      setSafetyOverrideError(err.message ?? 'Failed to update safety status.')
    } finally {
      setIsSafetyOverriding(false)
    }
  }

  // ── Close safety popover on outside click ─────────────────────────────────
  useEffect(() => {
    if (!safetyPopoverOpen) return
    function handleOutside(e) {
      if (safetyBadgeRef.current && !safetyBadgeRef.current.contains(e.target)) {
        setSafetyPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [safetyPopoverOpen])

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  // Disabled when user is actively typing inside any input or textarea.
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName
      const isTyping =
        tag === 'TEXTAREA' ||
        tag === 'INPUT'    ||
        document.activeElement?.isContentEditable

      if (isTyping) return

      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault()
          handleActionRef.current?.('approved')
          break
        case 'r':
          e.preventDefault()
          handleActionRef.current?.('rejected')
          break
        case 'e':
          e.preventDefault()
          textareaRef.current?.focus()
          break
        case 'f':
          e.preventDefault()
          handleActionRef.current?.('flagged_unsafe')
          break
        case 'escape':
          navigate('/')
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate]) // navigate is stable; all other values accessed via handleActionRef

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-start">

      {/* ════════════════════════════════════════════════════════════════════
          LEFT — Post context (reading area)
          ════════════════════════════════════════════════════════════════════ */}
      <article>

        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1.5 mb-6">
          <platform.Icon size={14} strokeWidth={1.8} className={platform.color} />
          <span className="text-sm font-medium text-cream-700">{source}</span>

          {post.author && post.subreddit && (
            <span className="text-sm text-cream-400">u/{post.author}</span>
          )}

          <span className="text-cream-300 select-none" aria-hidden="true">·</span>

          <span className="inline-flex items-center gap-1 text-xs text-cream-400">
            <Clock size={11} strokeWidth={1.8} />
            {relativeTime(post.created_at)}
          </span>

          {post.upvotes > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-cream-400">
              <ChevronUp size={12} strokeWidth={2} />
              {post.upvotes.toLocaleString()}
            </span>
          )}

          {post.comment_count > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-cream-400">
              <MessageCircle size={11} strokeWidth={1.8} />
              {post.comment_count.toLocaleString()}
            </span>
          )}

          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-cream-400 hover:text-cream-700 transition-colors ml-auto"
            >
              <ExternalLink size={11} strokeWidth={1.8} />
              View original
            </a>
          )}
        </div>

        {/* Title */}
        {post.title && (
          <h1
            className="font-serif text-h2 text-cream-900 leading-snug mb-5"
            style={{ maxWidth: '68ch' }}
          >
            {post.title}
          </h1>
        )}

        {/* Body — split on blank lines for readable paragraphs */}
        <div
          className="text-base text-cream-700 leading-relaxed space-y-4"
          style={{ maxWidth: '65ch' }}
        >
          {post.body.split('\n\n').filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {/* ── Relevance section ───────────────────────────────────────────── */}
        {(post.relevance_score != null || post.relevance_reason) && (
          <div className="mt-8 rounded-lg bg-cream-50 border border-cream-200 px-5 py-4 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-cream-400 uppercase tracking-wider">
                Relevance
              </span>
              {post.relevance_score != null && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium tabular-nums ${relevancePillClass(post.relevance_score)}`}
                >
                  {post.relevance_score.toFixed(2)}
                </span>
              )}
            </div>

            {post.relevance_reason && (
              <p className="text-sm text-cream-600 leading-relaxed">
                {post.relevance_reason}
              </p>
            )}
          </div>
        )}

        {/* ── Safety flags ─────────────────────────────────────────────────── */}
        {post.safety_flags?.length > 0 && (
          <div
            className={[
              'mt-3 rounded-lg px-5 py-4 space-y-3',
              isBlocked
                ? 'bg-blocked-bg/60 border border-blocked-ring/20'
                : 'bg-flagged-bg/50 border border-flagged-ring/20',
            ].join(' ')}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-wider ${
                isBlocked ? 'text-blocked-text' : 'text-flagged-text'
              }`}
            >
              Safety Flags
            </p>
            <ul className="space-y-2">
              {post.safety_flags.map((flag, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2.5 text-sm ${
                    isBlocked ? 'text-blocked-text' : 'text-flagged-text'
                  }`}
                >
                  <AlertTriangle
                    size={13}
                    strokeWidth={2}
                    className="mt-0.5 shrink-0 opacity-70"
                    aria-hidden="true"
                  />
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT — Review workspace (sticky)
          ════════════════════════════════════════════════════════════════════ */}
      <aside className="lg:sticky lg:top-8 space-y-3">

        {/* ── Safety status override ───────────────────────────────────────── */}
        <div className="relative z-10 rounded-xl bg-white/80 backdrop-blur-sm border border-cream-200 shadow-card px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-cream-500 uppercase tracking-wider">
              Safety Status
            </h2>
            <div className="relative" ref={safetyBadgeRef}>
              <button
                type="button"
                onClick={() => setSafetyPopoverOpen((v) => !v)}
                disabled={isSafetyOverriding}
                aria-expanded={safetyPopoverOpen}
                aria-haspopup="listbox"
                className={[
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill',
                  'text-xs font-medium transition-all duration-150 cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  safetyStatusLocal === 'safe'    ? 'bg-safe-bg text-safe-text focus-visible:ring-safe-ring' :
                  safetyStatusLocal === 'flagged' ? 'bg-flagged-bg text-flagged-text focus-visible:ring-flagged-ring' :
                  safetyStatusLocal === 'blocked' ? 'bg-blocked-bg text-blocked-text focus-visible:ring-blocked-ring' :
                  'bg-cream-200 text-cream-500 focus-visible:ring-cream-400',
                ].join(' ')}
              >
                {isSafetyOverriding ? (
                  <Loader2 size={10} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                ) : (
                  <ChevronDown size={10} strokeWidth={2.5} aria-hidden="true" />
                )}
                {safetyStatusLocal === 'safe'    ? 'Safe'    :
                 safetyStatusLocal === 'flagged' ? 'Flagged' :
                 safetyStatusLocal === 'blocked' ? 'Blocked' :
                 'Pending'}
              </button>

              {safetyPopoverOpen && (
                <div
                  role="listbox"
                  aria-label="Override safety status"
                  className={[
                    'absolute right-0 top-full mt-1.5 z-50',
                    'min-w-[148px] rounded-xl overflow-hidden',
                    'bg-white border border-cream-200',
                    'shadow-[0_8px_24px_oklch(22%_0.01_70_/_0.10),0_2px_6px_oklch(22%_0.01_70_/_0.06)]',
                  ].join(' ')}
                >
                  {[
                    { value: 'safe',    label: 'Safe',    activeCls: 'text-safe-text',    hoverCls: 'hover:bg-safe-bg/60' },
                    { value: 'flagged', label: 'Flagged', activeCls: 'text-flagged-text', hoverCls: 'hover:bg-flagged-bg/60' },
                    { value: 'blocked', label: 'Blocked', activeCls: 'text-blocked-text', hoverCls: 'hover:bg-blocked-bg/60' },
                  ].map(({ value, label, activeCls, hoverCls }) => (
                    <button
                      key={value}
                      role="option"
                      type="button"
                      aria-selected={safetyStatusLocal === value}
                      onClick={() => handleSafetyOverride(value)}
                      className={[
                        'flex items-center justify-between gap-3 w-full px-4 py-2.5 text-left',
                        'text-xs transition-colors duration-100',
                        activeCls,
                        hoverCls,
                        safetyStatusLocal === value ? 'font-semibold' : 'font-medium',
                      ].join(' ')}
                    >
                      {label}
                      {safetyStatusLocal === value && (
                        <CheckCircle2 size={11} strokeWidth={2.5} aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {safetyOverrideError && (
            <p className="text-xs text-blocked-text mt-2" role="alert">{safetyOverrideError}</p>
          )}
        </div>

        {/* Blocked post notice */}
        {isBlocked && (
          <div className="rounded-lg bg-blocked-bg/60 border border-blocked-ring/20 px-4 py-3.5">
            <p className="text-xs font-semibold text-blocked-text uppercase tracking-wider mb-1">
              Post blocked
            </p>
            <p className="text-sm text-blocked-text/80 leading-relaxed">
              Draft generation is unavailable for blocked content. You may still reject or flag this post.
            </p>
          </div>
        )}

        {/* ── Draft workspace ──────────────────────────────────────────────── */}
        <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-cream-200 shadow-card px-5 py-5 space-y-4">

          {/* Section header */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-cream-500 uppercase tracking-wider">
              Draft Comment
            </h2>
            <div className="flex items-center gap-2 text-xs text-cream-400">
              {draft && (
                <span className="tabular-nums">
                  v{draft.version}
                  {isModified && (
                    <span className="ml-1.5 text-flagged-text font-medium">edited</span>
                  )}
                </span>
              )}
              <span className="flex items-center gap-1">
                press <KbdHint letter="E" /> to focus
              </span>
            </div>
          </div>

          {/* Draft textarea or loading pulse */}
          {isGenerating ? (
            <DraftPulse />
          ) : (
            <textarea
              ref={textareaRef}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={(e) => {
                // Escape blurs the textarea so global shortcuts re-activate
                if (e.key === 'Escape') {
                  e.currentTarget.blur()
                  e.stopPropagation()
                }
              }}
              placeholder={isBlocked ? 'Unavailable for blocked posts.' : 'Draft will appear here.'}
              disabled={!draft && !isBlocked}
              readOnly={isBlocked && !draft}
              rows={8}
              aria-label="AI-generated draft comment"
              className={[
                'w-full resize-none rounded-lg px-4 py-3.5',
                'bg-cream-50 border border-cream-200',
                'text-sm text-cream-900 leading-relaxed',
                'placeholder:text-cream-300',
                'transition-all duration-150',
                'focus:outline-none focus:border-cream-400 focus:ring-2 focus:ring-cream-300/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              ].join(' ')}
            />
          )}

          {generateError && (
            <p className="text-xs text-blocked-text" role="alert">{generateError}</p>
          )}

          {/* Reviewer notes */}
          <div>
            <label
              htmlFor="reviewer-notes"
              className="block text-xs text-cream-500 mb-1.5"
            >
              Reviewer Notes
              <span className="ml-1 text-cream-400 font-normal">(optional)</span>
            </label>
            <input
              id="reviewer-notes"
              type="text"
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              placeholder="Add a note about this decision..."
              className={[
                'w-full rounded-lg px-4 py-2.5',
                'bg-cream-50 border border-cream-200',
                'text-sm text-cream-900 placeholder:text-cream-300',
                'transition-all duration-150',
                'focus:outline-none focus:border-cream-400 focus:ring-2 focus:ring-cream-300/50',
              ].join(' ')}
            />
          </div>

          {/* Steering input + regenerate */}
          {!isBlocked && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={steeringPrompt}
                onChange={(e) => setSteeringPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate() }}
                placeholder="E.g., Make it shorter, sound more empathetic..."
                disabled={isGenerating || isSubmitting}
                aria-label="Steering instructions for draft regeneration"
                className={[
                  'flex-1 min-w-0 rounded-lg px-3 py-2',
                  'bg-[oklch(98.5%_0.006_75)] border border-cream-200',
                  'text-xs text-cream-900 placeholder:text-cream-300',
                  'transition-all duration-150',
                  'focus:outline-none focus:border-cream-400 focus:ring-2 focus:ring-cream-300/40',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || isSubmitting}
                aria-label="Regenerate draft"
                className={[
                  'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                  'text-cream-500 bg-[oklch(97%_0.007_75)] border border-cream-200',
                  'hover:text-cream-800 hover:bg-cream-100 hover:border-cream-300',
                  'transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-300/50',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                ].join(' ')}
              >
                <RefreshCcw
                  size={13}
                  strokeWidth={2}
                  className={isGenerating ? 'animate-spin' : ''}
                  aria-hidden="true"
                />
              </button>
            </div>
          )}
        </div>

        {/* ── Action row ──────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-cream-200 shadow-card px-5 py-5 space-y-4">
          <h2 className="text-xs font-semibold text-cream-500 uppercase tracking-wider">
            Decision
          </h2>

          {submitError && (
            <p className="text-xs text-blocked-text" role="alert">{submitError}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {/* Approve */}
            <ActionButton
              variant="dark"
              onClick={() => handleAction('approved')}
              disabled={!draft || isSubmitting || isBlocked}
            >
              {isSubmitting ? (
                <Loader2 size={13} strokeWidth={2} className="animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />
              )}
              Approve
              <KbdHint letter="A" />
            </ActionButton>

            {/* Edit & Approve */}
            <ActionButton
              variant="darkAlt"
              onClick={() => handleAction('edited')}
              disabled={!draft || isSubmitting || isBlocked}
            >
              <PenLine size={13} strokeWidth={2} aria-hidden="true" />
              Edit & Approve
            </ActionButton>

            {/* Reject */}
            <ActionButton
              variant="ghost"
              onClick={() => handleAction('rejected')}
              disabled={!draft || isSubmitting}
            >
              <XCircle size={13} strokeWidth={2} aria-hidden="true" />
              Reject
              <KbdHint letter="R" />
            </ActionButton>

            {/* Flag Unsafe */}
            <ActionButton
              variant="warn"
              onClick={() => handleAction('flagged_unsafe')}
              disabled={!draft || isSubmitting}
            >
              <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
              Flag Unsafe
              <KbdHint letter="F" />
            </ActionButton>
          </div>

          {/* Shortcut legend */}
          <p className="text-xs text-cream-400">
            Shortcuts active outside inputs.{' '}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="underline underline-offset-2 hover:text-cream-700 transition-colors"
            >
              Esc to exit
            </button>
          </p>
        </div>

        {/* ── Review history (collapsed) ──────────────────────────────────── */}
        {post.reviews?.length > 0 && (
          <div className="rounded-xl bg-white/60 backdrop-blur-sm border border-cream-200 shadow-card overflow-hidden">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex items-center justify-between gap-2 w-full px-5 py-4 text-left hover:bg-cream-50/60 transition-colors duration-150 rounded-xl"
              aria-expanded={historyOpen}
            >
              <span className="text-xs font-semibold text-cream-500 uppercase tracking-wider">
                Review History
                <span className="ml-1.5 normal-case font-normal text-cream-400">
                  ({post.reviews.length})
                </span>
              </span>
              {historyOpen ? (
                <ChevronDown size={14} strokeWidth={2} className="text-cream-400" aria-hidden="true" />
              ) : (
                <ChevronRight size={14} strokeWidth={2} className="text-cream-400" aria-hidden="true" />
              )}
            </button>

            {historyOpen && (
              <ul className="px-5 pb-4" role="list">
                {post.reviews.map((review) => (
                  <ReviewHistoryItem key={review.id} review={review} />
                ))}
              </ul>
            )}
          </div>
        )}

      </aside>
    </div>
  )
}
