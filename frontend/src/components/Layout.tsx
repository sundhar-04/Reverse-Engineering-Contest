import { Link } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-900 to-surface-950 flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      <footer className="border-t border-surface-800 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-xs text-gray-600">
          ReverseCode Arena &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
