interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'stats' | 'editor' | 'text'
  count?: number
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse bg-surface-700/60 rounded-lg ${className}`} />
}

export default function LoadingSkeleton({ variant = 'text', count = 1 }: LoadingSkeletonProps) {
  if (variant === 'stats') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-800 rounded-xl p-4 border border-surface-700 space-y-3">
            <SkeletonBlock className="h-8 w-16" />
            <SkeletonBlock className="h-4 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-full" />
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonBlock key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-surface-800 rounded-xl p-6 border border-surface-700 space-y-3">
            <SkeletonBlock className="h-5 w-3/4" />
            <SkeletonBlock className="h-4 w-1/2" />
            <SkeletonBlock className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'editor') {
    return (
      <div className="h-full flex flex-col space-y-2 p-4">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="flex-1 w-full" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-10 w-24" />
          <SkeletonBlock className="h-10 w-24" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3 text-gray-500">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  )
}
