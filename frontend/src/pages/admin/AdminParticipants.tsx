import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import EmptyState from '../../components/EmptyState'

export default function AdminParticipants() {
  const { contestId } = useParams<{ contestId: string }>()
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminAPI.getParticipants(contestId!)
      .then((res) => setParticipants(res.data))
      .finally(() => setLoading(false))
  }, [contestId])

  const filtered = participants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.roll_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Participants"
        backLink={`/admin/contests/${contestId}`}
        rightSlot={
          <input
            type="text"
            placeholder="Search name or roll..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition w-48"
          />
        }
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <LoadingSkeleton variant="table" count={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No participants match your search' : 'No participants yet'}
            description={search ? 'Try a different name or roll number.' : 'Participants will appear here once they join the contest.'}
          />
        ) : (
          <div className="bg-surface-800 rounded-xl border border-surface-700 shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-surface-700/50 text-sm font-medium text-gray-400">
              <div>Name</div>
              <div>Roll Number</div>
              <div>Department</div>
              <div>Joined</div>
            </div>
            {filtered.map((p) => (
              <div key={p.id} className="grid grid-cols-4 gap-4 px-6 py-3 border-t border-surface-700 text-sm">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-gray-400">{p.roll_number}</div>
                <div className="text-gray-400">{p.department}</div>
                <div className="text-gray-500">{new Date(p.joined_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
