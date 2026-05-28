/**
 * Dashboard — the primary view: Navbar, StatsBar, FilterBar, PostFeed.
 *
 * All data fetching and filter state lives here. The Ingest Posts button
 * triggers the backend pipeline and refreshes both the feed and stats.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'

import StatsBar from '../components/StatsBar'
import FilterBar from '../components/FilterBar'
import PostFeed from '../components/PostFeed'
import GrassEffect from '../components/GrassEffect'
import { fetchPosts, fetchStats, ingestPosts } from '../utils/api'

const INITIAL_FILTERS = {
  platform: 'all',
  safety_status: null,
  search: '',
}

function SoniaLogo() {
  return (
    <svg
      width="28"
      height="27"
      viewBox="0 0 109 107"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M44.2123 23.1877C38.6473 23.4722 32.663 24.0408 28.5798 26.9602C26.0852 28.7425 24.5952 31.2638 24.1508 33.8547C23.7064 36.4455 24.2743 39.1059 25.4596 41.5577C27.4765 45.7473 31.3293 49.4064 36.2436 51.8012C41.158 54.196 47.1103 55.3147 52.9057 54.9356C53.6548 54.8851 54.5026 54.7586 54.865 54.253C55.2351 53.735 54.8567 53.0654 54.2727 52.6798C51.8369 51.0728 44.0162 48.9852 44.6679 45.1479C45.0547 42.8713 47.4156 41.8887 49.473 41.4413C57.9169 39.6055 66.6941 41.1371 75.2063 39.7796C79.2474 39.135 83.6253 36.9042 84.0316 32.5025C84.2211 30.4612 83.3151 28.3759 81.5786 26.8277C79.6935 25.1529 76.9357 24.1549 74.1203 23.6683C71.3049 23.1817 68.3908 23.1562 65.5011 23.1378C58.4213 23.0873 51.2672 22.8276 44.2123 23.1877Z"
        fill="#6B8AAA"
      />
      <path
        d="M65.5678 88.9995C69.5602 88.851 73.5929 88.431 77.3904 87.0016C83.6201 84.6567 88.9355 77.6047 88.1204 69.1691C87.2482 60.146 80.744 52.6503 74.4864 48.8183C71.1601 46.7812 67.548 45.4688 63.8764 44.8064C61.9825 44.4648 54.6572 42.8019 53.6318 45.5728C53.0716 47.0877 54.6655 47.8832 55.6001 47.9444C59.3351 48.188 62.7257 49.4308 64.6357 53.779C69.5602 64.9908 46.6025 63.06 42.6998 62.7838C38.3142 62.4737 33.6286 61.2498 29.2893 61.9604C24.7266 62.7077 22.3615 65.8475 21.5238 71.2568C21.244 73.0646 20.966 74.8903 21.0034 76.7308C21.0937 81.2085 23.886 84.7327 27.0495 86.512C32.4956 89.5746 38.894 89.0583 44.7358 89.1997C50.3779 89.3364 56.0207 89.1552 61.6622 89.0845C62.9526 89.0684 64.2578 89.0488 65.5666 89.0001L65.5678 88.9995Z"
        fill="#6B8AAA"
      />
    </svg>
  )
}

function Navbar({ onIngest, ingesting }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-cream-200 bg-white/80 backdrop-blur-md">
      <div className="max-w-content mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <SoniaLogo />
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg text-cream-900 tracking-tight leading-none">
              Sonia
            </span>
            <span className="text-cream-300 select-none text-sm">·</span>
            <span className="text-sm text-cream-600 font-medium">Comment Assist</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-cream-400 mr-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sage-DEFAULT animate-pulse" />
            Internal tool
          </div>
          <button
            onClick={onIngest}
            disabled={ingesting}
            className={[
              'btn-primary text-sm',
              ingesting ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
          >
            <RefreshCw
              size={14}
              strokeWidth={2}
              className={ingesting ? 'animate-spin' : ''}
            />
            {ingesting ? 'Ingesting...' : 'Ingest Posts'}
          </button>
        </div>
      </div>
    </header>
  )
}

function IngestBanner({ result, onDismiss }) {
  if (!result) return null
  return (
    <div className="rounded-lg bg-safe-bg border border-safe-ring/30 px-4 py-3 flex items-center justify-between gap-3 text-sm">
      <span className="text-safe-text font-medium">
        Ingested {result.inserted} new post{result.inserted !== 1 ? 's' : ''}.
        {result.skipped_existing > 0 && ` ${result.skipped_existing} already existed.`}
      </span>
      <button
        onClick={onDismiss}
        className="text-safe-text/60 hover:text-safe-text transition-colors text-xs shrink-0"
      >
        Dismiss
      </button>
    </div>
  )
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null
  return (
    <div className="rounded-lg bg-blocked-bg border border-blocked-ring/30 px-4 py-3 flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-blocked-text">
        <AlertCircle size={14} strokeWidth={2} />
        {message}
      </span>
      <button
        onClick={onDismiss}
        className="text-blocked-text/60 hover:text-blocked-text transition-colors text-xs shrink-0"
      >
        Dismiss
      </button>
    </div>
  )
}

export default function Dashboard() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [posts, setPosts] = useState([])
  const [totalPosts, setTotalPosts] = useState(0)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [ingesting, setIngesting] = useState(false)
  const [ingestResult, setIngestResult] = useState(null)
  const [error, setError] = useState(null)
  const searchDebounce = useRef(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)
    return () => clearTimeout(searchDebounce.current)
  }, [filters.search])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { limit: 100 }
      if (filters.platform && filters.platform !== 'all') {
        params.platform = filters.platform
      }
      if (filters.safety_status) {
        params.safety_status = filters.safety_status
      }
      const data = await fetchPosts(params)
      const allPosts = data.posts ?? []
      const search = debouncedSearch.trim().toLowerCase()
      const filtered = search
        ? allPosts.filter(
            (p) =>
              (p.title ?? '').toLowerCase().includes(search) ||
              (p.body ?? '').toLowerCase().includes(search) ||
              (p.author ?? '').toLowerCase().includes(search) ||
              (p.subreddit ?? '').toLowerCase().includes(search)
          )
        : allPosts
      setPosts(filtered)
      setTotalPosts(data.total ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters.platform, filters.safety_status, debouncedSearch])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await fetchStats()
      setStats(data)
    } catch {
      // Stats failing silently is acceptable; feed is the primary interface
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  async function handleIngest() {
    setIngesting(true)
    setIngestResult(null)
    setError(null)
    try {
      const result = await ingestPosts({ include_mock: true })
      setIngestResult(result)
      await Promise.all([loadPosts(), loadStats()])
    } catch (err) {
      setError(`Ingestion failed: ${err.message}`)
    } finally {
      setIngesting(false)
    }
  }

  const hasActiveFilters =
    filters.platform !== 'all' ||
    filters.safety_status !== null ||
    filters.search.trim() !== ''

  return (
    <div className="relative animate-fade-in-up overflow-hidden">
      <GrassEffect />

      <div className="relative z-10">
      <Navbar onIngest={handleIngest} ingesting={ingesting} />

      <main className="max-w-content mx-auto px-6 py-8 flex flex-col gap-6">
        <StatsBar stats={stats} loading={statsLoading} />

        {(ingestResult || error) && (
          <div className="flex flex-col gap-2">
            <IngestBanner result={ingestResult} onDismiss={() => setIngestResult(null)} />
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <FilterBar filters={filters} onChange={setFilters} />

        <PostFeed
          posts={posts}
          loading={loading}
          hasFilters={hasActiveFilters}
          total={totalPosts}
        />
      </main>
      </div>
    </div>
  )
}
