import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { submissionAPI } from '../../services/api'
import type { Submission } from '../../types/api'
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

  if (loading) return <LoadingSkeleton variant="card" count={5} />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Submission History"
        backLink={`/contest/${contestId}`}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description="Once you submit a solution, it will appear here."
          />
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => (
              <div key={s.id} className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border ${VERDICT_STYLES[s.verdict] || ''}`}>
                      {s.verdict.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-400">
                      {s.passed_test_cases}/{s.total_test_cases} test cases passed
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    {new Date(s.submitted_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  {s.execution_time && (
                    <span className="text-xs text-gray-500">Runtime: {s.execution_time}ms</span>
                  )}
                  {s.language && (
                    <span className="text-xs text-gray-500">{s.language}</span>
                  )}
                </div>
                {s.failed_test_case && (
                  <div className="mt-3 p-3 bg-surface-900 rounded-lg border border-surface-700">
                    <p className="text-xs text-red-400 font-medium">
                      Failed on test case #{s.failed_test_case.test_order + 1}
                    </p>
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
