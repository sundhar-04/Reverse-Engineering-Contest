import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import EmptyState from '../../components/EmptyState'

const VERDICT_STYLES: Record<string, string> = {
  accepted: 'text-green-400 bg-green-400/10 border-green-400/20',
  wrong_answer: 'text-red-400 bg-red-400/10 border-red-400/20',
  runtime_error: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  time_limit_exceeded: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  memory_limit_exceeded: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  compile_error: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  pending: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  running: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
}

export default function AdminSubmissions() {
  const { contestId } = useParams<{ contestId: string }>()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    adminAPI.getSubmissions(contestId!, 200)
      .then((res) => setSubmissions(res.data))
      .finally(() => setLoading(false))
  }, [contestId])

  const filtered = filter ? submissions.filter((s) => s.verdict === filter) : submissions

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Submissions"
        backLink={`/admin/contests/${contestId}`}
        rightSlot={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg bg-surface-900 border border-surface-600 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 transition"
          >
            <option value="">All</option>
            <option value="accepted">Accepted</option>
            <option value="wrong_answer">Wrong</option>
            <option value="runtime_error">Runtime Error</option>
            <option value="time_limit_exceeded">TLE</option>
          </select>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <LoadingSkeleton variant="table" count={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={filter ? 'No submissions match this filter' : 'No submissions yet'}
            description={filter ? 'Try a different filter.' : 'Submissions will appear here once participants submit solutions.'}
          />
        ) : (
          <div className="bg-surface-800 rounded-xl border border-surface-700 shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 gap-4 px-6 py-3 bg-surface-700/50 text-sm font-medium text-gray-400">
              <div>Name</div>
              <div>Roll No</div>
              <div>Problem</div>
              <div>Verdict</div>
              <div>Tests</div>
              <div>Runtime</div>
              <div>Submitted</div>
            </div>
            {filtered.map((s) => (
              <div key={s.id} className="grid grid-cols-7 gap-4 px-6 py-3 border-t border-surface-700 text-sm">
                <div className="font-medium truncate">{s.participant_name}</div>
                <div className="text-gray-400">{s.roll_number}</div>
                <div className="text-xs text-primary-400 truncate">{s.problem_title || 'Unknown'}</div>
                <div>
                  <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border ${VERDICT_STYLES[s.verdict] || ''}`}>
                    {s.verdict.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div className="text-gray-400">{s.passed_test_cases}/{s.total_test_cases}</div>
                <div className="text-gray-400">{s.execution_time ? `${s.execution_time}ms` : '-'}</div>
                <div className="text-gray-500 text-xs">{new Date(s.submitted_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
