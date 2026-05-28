import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Suspense, lazy, Component } from 'react'

const Dashboard  = lazy(() => import('./pages/Dashboard.jsx'))
const PostDetail = lazy(() => import('./pages/PostDetail.jsx'))

function Blob({ className, style }) {
  return (
    <div aria-hidden="true" className={`blob ${className}`} style={style} />
  )
}

function BlobBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <Blob
        className="animate-blob-1"
        style={{
          width: '520px',
          height: '420px',
          top: '-80px',
          left: '-120px',
          background: 'oklch(84% 0.065 232 / 0.12)',
        }}
      />
      <Blob
        className="animate-blob-2"
        style={{
          width: '600px',
          height: '480px',
          bottom: '-100px',
          right: '-160px',
          background: 'oklch(83% 0.036 152 / 0.10)',
        }}
      />
      <Blob
        className="animate-blob-3"
        style={{
          width: '380px',
          height: '340px',
          top: '35%',
          right: '10%',
          background: 'oklch(82% 0.029 330 / 0.09)',
        }}
      />
    </div>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-cream-400 animate-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="max-w-content mx-auto px-6 py-12">
          <p className="text-blocked-text text-sm">Something went wrong loading this page.</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const location = useLocation()

  return (
    <div className="relative min-h-screen bg-cream-100">
      <BlobBackground />

      <div className="relative" style={{ zIndex: 1 }}>
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route
              path="/"
              element={
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              }
            />
            <Route
              path="/posts/:id"
              element={
                <ErrorBoundary>
                  <PostDetail />
                </ErrorBoundary>
              }
            />
            <Route
              path="*"
              element={
                <div className="max-w-content mx-auto px-6 py-20 text-center">
                  <p className="font-serif text-h2 text-cream-900 mb-3">404</p>
                  <p className="text-cream-600 mb-6">Page not found.</p>
                  <Link to="/" className="btn-primary inline-flex">Back to feed</Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}
