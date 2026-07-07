import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-mesh-hero bg-mesh-hero-animated relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[12%] left-[8%] w-40 h-40 rounded-full border border-primary-500/10 animate-float" />
        <div className="absolute bottom-[25%] right-[12%] w-28 h-28 rounded-full border border-purple-500/10 animate-float-delayed" />
        <div className="absolute top-[20%] right-[25%] w-px h-48 bg-gradient-to-b from-primary-500/15 to-transparent animate-float" />
        <div className="absolute bottom-[30%] left-[5%] w-px h-36 bg-gradient-to-b from-purple-500/10 to-transparent animate-float-delayed" />
        <div className="absolute top-[35%] left-[30%]">
          <span className="text-7xl text-primary-500/[0.04] font-mono font-bold select-none animate-float">&lt;/&gt;</span>
        </div>
        <div className="absolute bottom-[20%] right-[20%]">
          <span className="text-4xl text-primary-500/[0.03] font-mono select-none animate-float-delayed">{'{ }'}</span>
        </div>
        <div className="absolute top-[60%] left-[12%]">
          <span className="text-3xl text-primary-500/[0.03] font-mono select-none animate-float">fn()</span>
        </div>
      </div>

      <header className="border-b border-surface-700/60 bg-surface-900/60 backdrop-blur-xl relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold text-primary-400 font-mono">&lt;/&gt;</span>
            <span className="text-lg font-bold">ReverseCode Arena</span>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="px-4 py-2 text-sm rounded-lg border border-surface-600 hover:bg-surface-700 hover:border-surface-500 transition shadow-sm">
              Admin Login
            </Link>
            <Link to="/join" className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 transition shadow-sm">
              Join Contest
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16 relative z-10">
        <div className="text-center max-w-3xl animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shadow-[0_0_60px_-15px_rgba(139,92,246,0.3)]">
            <span className="text-3xl text-primary-400 font-mono font-bold">&lt;/&gt;</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            ReverseCode <span className="text-primary-400">Arena</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            A platform for reverse engineering programming contests.
            Analyze executables, uncover hidden algorithms, and write equivalent solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/join"
              className="px-8 py-3 rounded-lg bg-primary-600 hover:bg-primary-500 transition text-base font-medium shadow-lg shadow-primary-600/25"
            >
              Join Contest
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 rounded-lg border border-surface-600 hover:bg-surface-700 hover:border-surface-500 transition text-base font-medium shadow-sm"
            >
              Organizer Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
