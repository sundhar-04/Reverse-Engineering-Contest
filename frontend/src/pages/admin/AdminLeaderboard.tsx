import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import type { LeaderboardEntry } from '../../types/api'

export default function AdminLeaderboard() {
  const { contestId } = useParams<{ contestId: string }>()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    adminAPI.getLeaderboard(contestId!).then((res) => setEntries(res.data.entries || []))
  }, [contestId])

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="border-b border-surface-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={`/admin/contests/${contestId}`} className="text-primary-400 hover:text-primary-300">&larr; Contest</Link>
          <h1 className="text-xl font-bold">Leaderboard</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-surface-700/50 text-sm font-medium text-gray-400">
            <div>Rank</div>
            <div>Name</div>
            <div>Roll No</div>
            <div>Status</div>
            <div>Attempts</div>
            <div>Last Submission</div>
          </div>
          {entries.map((e) => (
            <div key={e.id} className="grid grid-cols-6 gap-4 px-6 py-3 border-t border-surface-700 text-sm">
              <div className="font-bold">#{e.rank}</div>
              <div className="font-medium">{e.name}</div>
              <div className="text-gray-400">{e.roll_number}</div>
              <div>
                {e.is_accepted ? (
                  <span className="text-green-400 text-xs font-medium">✓ Accepted</span>
                ) : (
                  <span className="text-yellow-400 text-xs">Pending</span>
                )}
              </div>
              <div className="text-gray-400">{e.attempts}</div>
              <div className="text-gray-500 text-xs">
                {e.last_submission_time ? new Date(e.last_submission_time).toLocaleString() : '-'}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
