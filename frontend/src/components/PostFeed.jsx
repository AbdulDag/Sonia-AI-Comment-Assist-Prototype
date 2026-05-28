/**
 * PostFeed — the list container for PostCards.
 *
 * Handles three states: loading skeletons, empty, and populated.
 * Skeletons use a cream-toned pulse (never generic gray).
 * Empty states are warm and contextual based on whether any posts exist.
 */

import PostCard from './PostCard'
import { Inbox, SlidersHorizontal } from 'lucide-react'

function CardSkeleton({ delay = 0 }) {
  return (
    <div
      className="rounded-xl bg-white/50 border border-cream-200 px-5 py-4 animate-pulse"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-cream-200" />
          <div className="h-3 w-24 rounded-md bg-cream-200" />
        </div>
        <div className="h-3 w-16 rounded-md bg-cream-200" />
      </div>
      <div className="mb-3.5 space-y-2">
        <div className="h-4 w-4/5 rounded-md bg-cream-200" />
        <div className="h-3 w-full rounded-md bg-cream-200" />
        <div className="h-3 w-full rounded-md bg-cream-200" />
        <div className="h-3 w-3/5 rounded-md bg-cream-200" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 rounded-pill bg-cream-200" />
        <div className="h-5 w-14 rounded-pill bg-cream-200" />
        <div className="h-5 w-16 rounded-pill bg-cream-200" />
      </div>
    </div>
  )
}

function EmptyFiltered() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center mb-4">
        <SlidersHorizontal size={20} className="text-cream-500" strokeWidth={1.5} />
      </div>
      <p className="font-serif text-h3 text-cream-800 mb-2">
        Nothing matches these filters
      </p>
      <p className="text-sm text-cream-500 max-w-xs leading-relaxed">
        Try adjusting your platform selection, safety filter, or search terms to see more posts.
      </p>
    </div>
  )
}

function EmptyNoData() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center mb-4">
        <Inbox size={20} className="text-cream-500" strokeWidth={1.5} />
      </div>
      <p className="font-serif text-h3 text-cream-800 mb-2">
        All caught up
      </p>
      <p className="text-sm text-cream-500 max-w-xs leading-relaxed">
        No posts have been ingested yet. Use the Ingest Posts button above to load fresh content from your sources.
      </p>
    </div>
  )
}

export default function PostFeed({ posts, loading, hasFilters, total }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 0.05, 0.1, 0.15, 0.2].map((delay, i) => (
          <CardSkeleton key={i} delay={delay} />
        ))}
      </div>
    )
  }

  if (!posts || posts.length === 0) {
    return total === 0 ? <EmptyNoData /> : <EmptyFiltered />
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
