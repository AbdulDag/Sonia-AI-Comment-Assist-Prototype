import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchPost } from '../utils/api'
import ReviewPanel from '../components/ReviewPanel'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Bone({ className = '' }) {
  return <div className={`rounded animate-pulse bg-cream-200 ${className}`} />
}

function ReviewSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-10 mt-2">
      {/* Left — post reading area */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Bone className="h-4 w-20" />
          <Bone className="h-4 w-16" />
        </div>
        <Bone className="h-8 w-3/4 mt-3" />
        <Bone className="h-8 w-1/2" />
        <div className="space-y-2.5 mt-5">
          {[1, 0.88, 1, 0.82, 1, 0.73, 0.9, 1, 0.65].map((w, i) => (
            <Bone key={i} className="h-4" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
        <Bone className="h-24 rounded-xl mt-6" />
      </div>

      {/* Right — workspace */}
      <div className="space-y-3">
        <Bone className="h-6 w-32 mb-1" />
        <Bone className="h-44 rounded-xl" />
        <Bone className="h-11 rounded-lg" />
        <Bone className="h-px w-full" />
        <Bone className="h-36 rounded-xl mt-1" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [post, setPost]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchPost(id)
      .then((data) => {
        if (!cancelled) {
          setPost(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load post.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [id])

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm text-cream-600 hover:text-cream-900 transition-colors duration-150 mb-8"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to feed
      </button>

      {loading && <ReviewSkeleton />}

      {!loading && error && (
        <div className="max-w-lg rounded-lg bg-blocked-bg/60 border border-blocked-ring/20 px-4 py-3">
          <p className="text-sm text-blocked-text">{error}</p>
        </div>
      )}

      {!loading && post && (
        <ReviewPanel post={post} onComplete={() => navigate('/')} />
      )}
    </div>
  )
}
