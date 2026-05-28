import { useParams, Link } from 'react-router-dom'

// Phase 3: Full post detail + review panel — built in Phase 3
export default function PostDetail() {
  const { id } = useParams()
  return (
    <div className="max-w-content mx-auto px-6 py-12 animate-fade-in-up">
      <Link to="/" className="text-sm text-cream-600 hover:text-cream-900 mb-6 inline-block">
        ← Back to feed
      </Link>
      <h1 className="font-serif text-h1 text-cream-900 mb-2">Post Detail</h1>
      <p className="text-cream-600">
        Review panel for post <code className="text-sm bg-cream-200 px-1 rounded">{id}</code> — coming in Phase 3.
      </p>
    </div>
  )
}
