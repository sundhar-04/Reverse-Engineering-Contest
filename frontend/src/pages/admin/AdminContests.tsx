import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import EmptyState from '../../components/EmptyState'

export default function AdminContests() {
  const [contests, setContests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.listContests()
      .then((res) => setContests(res.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="All Contests"
        backLink="/admin"
        rightSlot={
          <Link to="/admin/contests/create" className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 transition shadow-sm">
            Create Contest
          </Link>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <LoadingSkeleton variant="card" count={5} />
        ) : contests.length === 0 ? (
          <EmptyState
            title="No contests yet"
            description="Create your first contest to get started."
            action={{ label: 'Create Contest', onClick: () => window.location.href = '/admin/contests/create' }}
          />
        ) : (
          <div className="space-y-3">
            {contests.map((c: any) => (
              <Link key={c.id} to={`/admin/contests/${c.id}`} className="block bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm hover:border-primary-500 hover:shadow-primary-500/5 transition">
                <div className="flex justify-between items-center">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{c.name}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{c.participant_count} participants · {c.submission_count} submissions</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
