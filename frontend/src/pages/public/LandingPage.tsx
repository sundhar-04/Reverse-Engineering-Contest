import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary-400">&lt;/&gt;</span>
            <span className="text-xl font-bold">ReverseCode Arena</span>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="px-4 py-2 text-sm rounded-lg border border-surface-600 hover:bg-surface-700 transition">
              Admin Login
            </Link>
            <Link to="/join" className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 transition">
              Join Contest
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-3xl">
          <div className="text-6xl mb-6 text-primary-400">&lt;/&gt;</div>
          <h1 className="text-5xl font-bold mb-4">
            ReverseCode <span className="text-primary-400">Arena</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            A platform for reverse engineering programming contests.
            Analyze executables, uncover hidden algorithms, and write equivalent solutions.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/join"
              className="px-8 py-3 rounded-lg bg-primary-600 hover:bg-primary-500 transition text-lg font-medium"
            >
              Join Contest
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 rounded-lg border border-surface-600 hover:bg-surface-700 transition text-lg font-medium"
            >
              Organizer Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
