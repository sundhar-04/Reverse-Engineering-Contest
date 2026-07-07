import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { submissionAPI } from '../../services/api'
import type { Submission } from '../../types/api'

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

export default function SubmissionsPage() {
  const { contestId } = useParams<{ contestId: string }>()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pid = localStorage.getItem('participant_id')
    if (!pid) return
    submissionAPI.listByParticipant(pid).then((res) => {
      setSubmissions(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="border-b border-surface-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={`/contest/${contestId}`} className="text-primary-400 hover:text-primary-300">&larr; Dashboard</Link>
          <h1 className="text-xl font-bold">Submission History</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {submissions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No submissions yet</div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => (
              <div key={s.id} className="bg-surface-800 rounded-lg p-4 border border-surface-700">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${VERDICT_COLORS[s.verdict] || ''}`}>
                      {s.verdict.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-400 ml-3">
                      {s.passed_test_cases}/{s.total_test_cases} test cases passed
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(s.submitted_at).toLocaleString()}
                  </span>
                </div>
                {s.execution_time && (
                  <p className="text-xs text-gray-500 mt-1">Runtime: {s.execution_time}ms</p>
                )}
                {s.failed_test_case && (
                  <div className="mt-2 p-2 bg-surface-900 rounded text-xs">
                    <p className="text-red-400">Failed on test case #{s.failed_test_case.test_order + 1}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
