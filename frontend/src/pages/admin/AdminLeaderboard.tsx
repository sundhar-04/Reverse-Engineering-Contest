import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import type { LeaderboardEntry } from '../../types/api'
import PageHeader from '../../components/PageHeader'
import RankBadge from '../../components/RankBadge'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import EmptyState from '../../components/EmptyState'

export default function AdminLeaderboard() {
  const { contestId } = useParams<{ contestId: string }>()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.getLeaderboard(contestId!)
      .then((res) => setEntries(res.data.entries || []))
      .finally(() => setLoading(false))
  }, [contestId])

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Leaderboard"
        backLink={`/admin/contests/${contestId}`}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <LoadingSkeleton variant="table" count={8} />
        ) : entries.length === 0 ? (
          <EmptyState
            title="No entries yet"
            description="Leaderboard will populate once participants start submitting solutions."
          />
        ) : (
          <div className="bg-surface-800 rounded-xl border border-surface-700 shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 gap-4 px-6 py-3 bg-surface-700/50 text-sm font-medium text-gray-400">
              <div>Rank</div>
              <div>Name</div>
              <div>Roll No</div>
              <div>Score</div>
              <div>Solved</div>
              <div>Attempts</div>
              <div>Last Submission</div>
            </div>
            {entries.map((e) => (
              <div key={e.id} className="grid grid-cols-7 gap-4 px-6 py-3 border-t border-surface-700 text-sm items-center">
                <div><RankBadge rank={e.rank} /></div>
                <div className="font-medium truncate">{e.name}</div>
                <div className="text-gray-400">{e.roll_number}</div>
                <div>
                  <span className={`text-xs font-bold ${e.solved_count === e.total_problems ? 'text-green-400' : 'text-primary-400'}`}>
                    {e.total_score}/{e.max_score}
                  </span>
                </div>
                <div className="text-gray-400">{e.solved_count}/{e.total_problems}</div>
                <div className="text-gray-400">{e.attempts}</div>
                <div className="text-gray-500 text-xs">
                  {e.last_submission_time ? new Date(e.last_submission_time).toLocaleString() : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
