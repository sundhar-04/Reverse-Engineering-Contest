import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const VERDICT_COLORS: Record<string, string> = {
  accepted: 'text-green-400 bg-green-400/10',
  wrong_answer: 'text-red-400 bg-red-400/10',
  runtime_error: 'text-yellow-400 bg-yellow-400/10',
  time_limit_exceeded: 'text-orange-400 bg-orange-400/10',
  memory_limit_exceeded: 'text-orange-400 bg-orange-400/10',
  compile_error: 'text-yellow-400 bg-yellow-400/10',
  pending: 'text-gray-400 bg-gray-400/10',
  running: 'text-blue-400 bg-blue-400/10',
}

export default function AdminSubmissions() {
  const { contestId } = useParams<{ contestId: string }>()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    adminAPI.getSubmissions(contestId!, 200).then((res) => setSubmissions(res.data))
  }, [contestId])

  const filtered = filter ? submissions.filter((s) => s.verdict === filter) : submissions

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="border-b border-surface-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={`/admin/contests/${contestId}`} className="text-primary-400 hover:text-primary-300">&larr; Contest</Link>
          <h1 className="text-xl font-bold">Submissions</h1>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ml-auto px-3 py-1.5 text-sm rounded-lg bg-surface-900 border border-surface-600 focus:outline-none"
          >
            <option value="">All</option>
            <option value="accepted">Accepted</option>
            <option value="wrong_answer">Wrong</option>
            <option value="runtime_error">Runtime Error</option>
            <option value="time_limit_exceeded">TLE</option>
          </select>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-surface-700/50 text-sm font-medium text-gray-400">
            <div>Name</div>
            <div>Roll No</div>
            <div>Verdict</div>
            <div>Tests</div>
            <div>Runtime</div>
            <div>Submitted</div>
          </div>
          {filtered.map((s) => (
            <div key={s.id} className="grid grid-cols-6 gap-4 px-6 py-3 border-t border-surface-700 text-sm">
              <div className="font-medium truncate">{s.participant_name}</div>
              <div className="text-gray-400">{s.roll_number}</div>
              <div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${VERDICT_COLORS[s.verdict] || ''}`}>
                  {s.verdict.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              <div className="text-gray-400">{s.passed_test_cases}/{s.total_test_cases}</div>
              <div className="text-gray-400">{s.execution_time ? `${s.execution_time}ms` : '-'}</div>
              <div className="text-gray-500 text-xs">{new Date(s.submitted_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
