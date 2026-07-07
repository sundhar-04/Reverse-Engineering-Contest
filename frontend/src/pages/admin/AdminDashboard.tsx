import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import LoadingSkeleton from '../../components/LoadingSkeleton'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [contests, setContests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { logout, admin } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      adminAPI.dashboard(),
      adminAPI.listContests(),
    ]).then(([statsRes, contestsRes]) => {
      setStats(statsRes.data)
      setContests(contestsRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Admin Dashboard"
        rightSlot={
          <div className="flex gap-2">
            <Link to="/admin/contests/create" className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 transition shadow-sm">
              Create Contest
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 text-sm rounded-lg border border-surface-600 hover:bg-surface-700 transition shadow-sm">
              Logout
            </button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <LoadingSkeleton variant="stats" />
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm">
                  <p className="text-2xl font-bold text-primary-400">{stats.total_contests}</p>
                  <p className="text-sm text-gray-400 mt-1">Total Contests</p>
                </div>
                <div className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm">
                  <p className="text-2xl font-bold text-green-400">{stats.active_contests}</p>
                  <p className="text-sm text-gray-400 mt-1">Active Contests</p>
                </div>
                <div className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm">
                  <p className="text-2xl font-bold text-blue-400">{stats.total_participants}</p>
                  <p className="text-sm text-gray-400 mt-1">Total Participants</p>
                </div>
                <div className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm">
                  <p className="text-2xl font-bold text-yellow-400">{stats.total_submissions}</p>
                  <p className="text-sm text-gray-400 mt-1">Submissions ({stats.accepted_submissions} accepted)</p>
                </div>
              </div>
            )}

            <h2 className="text-lg font-semibold mb-4">Your Contests</h2>
            <div className="space-y-3">
              {contests.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>No contests yet</p>
                  <Link to="/admin/contests/create" className="text-primary-400 hover:text-primary-300 text-sm mt-2 inline-block">
                    Create your first contest
                  </Link>
                </div>
              )}
              {contests.map((c: any) => (
                <Link
                  key={c.id}
                  to={`/admin/contests/${c.id}`}
                  className="block bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm hover:border-primary-500 hover:shadow-primary-500/5 transition"
                >
                  <div className="flex justify-between items-center">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{c.name}</h3>
                      <p className="text-sm text-gray-400 mt-0.5">{c.participant_count} participants · {c.submission_count} submissions</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <StatusBadge status={c.status} />
                      <p className="text-xs text-gray-500 mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
