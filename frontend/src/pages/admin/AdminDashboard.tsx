import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [contests, setContests] = useState<any[]>([])
  const { logout, admin } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      adminAPI.dashboard(),
      adminAPI.listContests(),
    ]).then(([statsRes, contestsRes]) => {
      setStats(statsRes.data)
      setContests(contestsRes.data)
    })
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="border-b border-surface-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-gray-400">Welcome, {admin?.username}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/admin/contests/create" className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 transition">
              Create Contest
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 text-sm rounded-lg border border-surface-600 hover:bg-surface-700 transition">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface-800 rounded-xl p-4 border border-surface-700">
              <p className="text-2xl font-bold text-primary-400">{stats.total_contests}</p>
              <p className="text-sm text-gray-400">Total Contests</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-4 border border-surface-700">
              <p className="text-2xl font-bold text-green-400">{stats.active_contests}</p>
              <p className="text-sm text-gray-400">Active Contests</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-4 border border-surface-700">
              <p className="text-2xl font-bold text-blue-400">{stats.total_participants}</p>
              <p className="text-sm text-gray-400">Total Participants</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-4 border border-surface-700">
              <p className="text-2xl font-bold text-yellow-400">{stats.total_submissions}</p>
              <p className="text-sm text-gray-400">Submissions ({stats.accepted_submissions} accepted)</p>
            </div>
          </div>
        )}

        <h2 className="text-lg font-semibold mb-4">Your Contests</h2>
        <div className="space-y-3">
          {contests.length === 0 && <p className="text-gray-400">No contests yet</p>}
          {contests.map((c: any) => (
            <Link
              key={c.id}
              to={`/admin/contests/${c.id}`}
              className="block bg-surface-800 rounded-xl p-4 border border-surface-700 hover:border-primary-500 transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-sm text-gray-400">{c.participant_count} participants · {c.submission_count} submissions</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    c.status === 'running' ? 'text-green-400 bg-green-400/10' :
                    c.status === 'ended' ? 'text-gray-400 bg-gray-400/10' :
                    'text-yellow-400 bg-yellow-400/10'
                  }`}>
                    {c.status.toUpperCase()}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
