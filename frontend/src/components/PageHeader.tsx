import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  backLink?: string
  backLabel?: string
  rightSlot?: React.ReactNode
}

export default function PageHeader({ title, backLink, backLabel, rightSlot }: PageHeaderProps) {
  return (
    <header className="border-b border-surface-700 bg-surface-900/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {backLink && (
            <Link
              to={backLink}
              className="text-sm text-gray-400 hover:text-primary-400 transition shrink-0"
            >
              &larr; {backLabel || 'Back'}
            </Link>
          )}
          <h1 className="text-lg font-bold truncate">{title}</h1>
        </div>
        {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
      </div>
    </header>
  )
}
