/**
 * GrassEffect — Sonia-style interactive organic leaf blobs
 *
 * Soft watercolor "leaf" shapes that sit behind page content. Each blob starts
 * nearly invisible and gently reveals its color on hover — like Sonia's landing page.
 *
 * Usage:
 *   <section className="relative overflow-hidden">
 *     <GrassEffect />
 *     <div className="relative z-10">Your content here</div>
 *   </section>
 */

/** Default preset — 5 blobs matching the Sonia brand palette */
const SONIA_PRESET = [
  {
    pos: { top: '-80px', left: '-70px' },
    w: 360,
    h: 460,
    color: '#A8D5BA',
    rotate: -22,
    rx: '63% 37% 30% 70% / 50% 40% 60% 50%',
  },
  {
    pos: { top: '80px', left: '-45px' },
    w: 270,
    h: 340,
    color: '#9FBBE0',
    rotate: 28,
    rx: '40% 60% 65% 35% / 55% 45% 55% 45%',
  },
  {
    pos: { top: '-55px', right: '-55px' },
    w: 310,
    h: 410,
    color: '#C8B4D8',
    rotate: 18,
    rx: '55% 45% 40% 60% / 45% 55% 45% 55%',
  },
  {
    pos: { bottom: '-50px', right: '-40px' },
    w: 285,
    h: 370,
    color: '#9FBBE0',
    rotate: -28,
    rx: '45% 55% 60% 40% / 60% 40% 55% 45%',
  },
  {
    pos: { bottom: '-35px', left: '18%' },
    w: 260,
    h: 210,
    color: '#E8D5BA',
    rotate: 52,
    rx: '40% 60% 30% 70% / 60% 40% 70% 30%',
  },
]

export function GrassEffect({
  blobs = SONIA_PRESET,
  className = '',
  baseOpacity = 0.18,
  hoverOpacity = 0.44,
  hoverScale = 1.03,
  transitionMs = 550,
  blurPx = 0.5,
}) {
  const transition = `opacity ${transitionMs}ms ease, transform ${transitionMs}ms ease`

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {blobs.map((blob, i) => {
        const wrapperStyle = {
          position: 'absolute',
          ...blob.pos,
          width: blob.w,
          height: blob.h,
          transform: `rotate(${blob.rotate ?? 0}deg)`,
          transformOrigin: 'center',
          pointerEvents: 'auto',
        }

        const shapeStyle = {
          width: '100%',
          height: '100%',
          backgroundColor: blob.color,
          borderRadius: blob.rx,
          opacity: baseOpacity,
          transition,
          filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
        }

        return (
          <div key={i} style={wrapperStyle}>
            <div
              style={shapeStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = String(hoverOpacity)
                e.currentTarget.style.transform = `scale(${hoverScale})`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = String(baseOpacity)
                e.currentTarget.style.transform = 'scale(1)'
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

export default GrassEffect
