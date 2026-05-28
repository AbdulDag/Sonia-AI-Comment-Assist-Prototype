import axios from 'axios'

// ─── Axios instance ──────────────────────────────────────────────────────────
// Vite proxies /api → http://localhost:8000, so BASE_URL can stay relative.
// Set VITE_API_URL in .env to override for production deploys.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const http = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ─── Response interceptor — normalise errors ─────────────────────────────────
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.detail ??
      err.response?.data?.message ??
      err.message ??
      'An unexpected error occurred.'
    return Promise.reject(new Error(message))
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filterable list of posts.
 *
 * @param {Object} filters
 * @param {string}  [filters.platform]      - "reddit" | "tiktok" | "instagram" | "mock"
 * @param {string}  [filters.safety_status] - "safe" | "flagged" | "blocked"
 * @param {string}  [filters.status]        - "pending" | "reviewed" | "skipped"
 * @param {number}  [filters.page=1]
 * @param {number}  [filters.limit=50]
 * @returns {Promise<{ posts: Post[], total: number, page: number, limit: number }>}
 */
export function fetchPosts(filters = {}) {
  const params = {}
  if (filters.platform)      params.platform      = filters.platform
  if (filters.safety_status) params.safety_status = filters.safety_status
  if (filters.status)        params.status        = filters.status
  if (filters.page  != null) params.page          = filters.page
  if (filters.limit != null) params.limit         = filters.limit
  if (filters.safety_status === 'blocked') params.include_blocked = true

  return http.get('/api/posts', { params })
}

/**
 * Fetch a single post with its drafts and review history.
 *
 * @param {string} postId
 * @returns {Promise<PostDetail>}
 */
export function fetchPost(postId) {
  return http.get(`/api/posts/${postId}`)
}

/**
 * Trigger ingestion from Reddit (and/or load mock data).
 *
 * @param {Object} [options]
 * @param {string[]} [options.subreddits] - Override the default subreddit list
 * @param {boolean}  [options.include_mock=true]
 * @returns {Promise<{ ingested: number, skipped: number }>}
 */
export function ingestPosts(options = {}) {
  return http.post('/api/posts/ingest', options)
}

// ─────────────────────────────────────────────────────────────────────────────
// Drafts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate (or regenerate) a comment draft for a post.
 *
 * @param {string} postId
 * @param {Object} [options]
 * @param {string}  [options.steering_prompt] - Optional reviewer instruction to guide the draft
 * @returns {Promise<Draft>}
 */
export function generateDraft(postId, options = {}) {
  const payload = {}
  if (options.steering_prompt?.trim()) payload.steering_prompt = options.steering_prompt.trim()
  return http.post(`/api/posts/${postId}/draft`, payload)
}

/**
 * Manually override the safety classification of a post.
 *
 * @param {string} postId
 * @param {"safe"|"flagged"|"blocked"} safetyStatus
 * @returns {Promise<{ post_id: string, safety_status: string }>}
 */
export function overrideSafety(postId, safetyStatus) {
  return http.patch(`/api/posts/${postId}/safety`, { safety_status: safetyStatus })
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviews
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit a reviewer decision for a post + draft pair.
 *
 * @param {string} postId
 * @param {Object} payload
 * @param {string}  payload.draft_id       - ID of the draft being reviewed
 * @param {string}  payload.decision       - "approved" | "edited" | "rejected" | "flagged_unsafe"
 * @param {string}  [payload.edited_text]  - Required when decision === "edited"
 * @param {string}  [payload.reviewer_notes]
 * @returns {Promise<Review>}
 */
export function submitReview(postId, payload) {
  return http.post(`/api/posts/${postId}/review`, payload)
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch dashboard statistics.
 *
 * @returns {Promise<Stats>}
 */
export function fetchStats() {
  return http.get('/api/stats')
}

// ─────────────────────────────────────────────────────────────────────────────
// Named re-export object — convenience for consumers who prefer a namespace
// ─────────────────────────────────────────────────────────────────────────────
const api = {
  fetchPosts,
  fetchPost,
  ingestPosts,
  generateDraft,
  overrideSafety,
  submitReview,
  fetchStats,
}

export default api
