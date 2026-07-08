import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { contestAPI, problemAPI, submissionAPI } from '../../services/api'
import type { Contest, Problem, Submission } from '../../types/api'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import StatusBadge from '../../components/StatusBadge'

export default function ContestDashboard() {
  const { contestId } = useParams<{ contestId: string }>()
  const navigate = useNavigate()
  const [contest, setContest] = useState<Contest | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const participantName = localStorage.getItem('participant_name')
  const participantId = localStorage.getItem('participant_id')

  useEffect(() => {
    if (!participantId) {
      navigate('/join')
      return
    }
    loadData()
  }, [contestId])

  useEffect(() => {
    if (!timeRemaining || timeRemaining <= 0) return
    const timer = setInterval(() => setTimeRemaining((t) => (t ? t - 1 : 0)), 1000)
    return () => clearInterval(timer)
  }, [timeRemaining])

  const loadData = async () => {
    try {
      const [contestRes, problemRes] = await Promise.all([
        contestAPI.get(contestId!),
        problemAPI.list(contestId!),
      ])
      setContest(contestRes.data)
      setProblems(problemRes.data)

      const statusRes = await contestAPI.status(contestId!)
      if (statusRes.data.time_remaining) setTimeRemaining(statusRes.data.time_remaining)

      if (participantId) {
        const subRes = await submissionAPI.listByParticipant(participantId)
        setSubmissions(subRes.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getProblemStatus = (problemId: string): 'solved' | 'failed' | 'untouched' => {
    const problemSubs = submissions.filter((s) => s.problem_id === problemId)
    if (problemSubs.some((s) => s.verdict === 'accepted')) return 'solved'
    if (problemSubs.length > 0) return 'failed'
    return 'untouched'
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
  }

  if (loading) return <LoadingSkeleton variant="card" count={4} />

  if (!contest) return null

  return (
    <div className="min-h-full bg-mesh-dashboard relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary-500/[0.03] rounded-full blur-3xl" />
      </div>

      <header className="border-b border-surface-700/60 bg-surface-900/70 backdrop-blur-xl sticky top-0 z-40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold truncate">{contest.name}</h1>
            <p className="text-xs text-gray-400">Welcome, {participantName}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge status={contest.status} />
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-500/10 border border-primary-500/20">
                <svg className="w-3.5 h-3.5 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-sm font-mono text-primary-400 font-medium">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* Problem Cards */}
          {problems.map((p) => {
            const status = getProblemStatus(p.id)
            const statusColors = {
              solved: 'border-green-500/40 hover:border-green-500',
              failed: 'border-red-500/30 hover:border-red-500',
              untouched: 'border-surface-700/80 hover:border-primary-500/50',
            }
            const statusBadge = {
              solved: { text: 'Solved', class: 'bg-green-500/15 text-green-400' },
              failed: { text: 'Attempted', class: 'bg-red-500/15 text-red-400' },
              untouched: { text: `${p.score} pts`, class: 'bg-surface-700/50 text-gray-400' },
            }
            return (
              <Link
                key={p.id}
                to={`/contest/${contestId}/ide?problemId=${p.id}`}
                className={`group bg-surface-800/80 backdrop-blur-sm rounded-xl p-6 border shadow-sm hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-200 ${statusColors[status]}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                    <span className="text-xl font-mono text-primary-400 font-bold">&lt;/&gt;</span>
                  </div>
                  <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${statusBadge[status].class}`}>
                    {statusBadge[status].text}
                  </span>
                </div>
                <h2 className="text-lg font-semibold group-hover:text-primary-400 transition-colors">{p.title}</h2>
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{p.description || 'No description'}</p>
                {p.executable_name && (
                  <p className="text-xs text-gray-500 mt-2">Executable: {p.executable_name}</p>
                )}
              </Link>
            )
          })}

          {/* Download Executable per problem */}
          {problems.filter((p) => p.executable_name).map((p) => (
            <button
              key={`dl-${p.id}`}
              onClick={async () => {
                try {
                  const res = await problemAPI.downloadExecutable(p.id)
                  const url = URL.createObjectURL(new Blob([res.data]))
                  const a = document.createElement('a')
                  a.href = url
                  a.download = p.executable_name || 'executable.exe'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (err) {
                  console.error(err)
                }
              }}
              className="group bg-surface-800/80 backdrop-blur-sm rounded-xl p-6 border border-surface-700/80 shadow-sm hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-200 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4 group-hover:bg-primary-500/20 transition-colors">
                <svg className="w-6 h-6 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold group-hover:text-primary-400 transition-colors">Download: {p.title}</h2>
              <p className="text-sm text-gray-400 mt-1">{p.executable_name}</p>
            </button>
          ))}

          {/* Submissions */}
          <Link to={`/contest/${contestId}/submissions`} className="group bg-surface-800/80 backdrop-blur-sm rounded-xl p-6 border border-surface-700/80 shadow-sm hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4 group-hover:bg-primary-500/20 transition-colors">
              <svg className="w-6 h-6 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold group-hover:text-primary-400 transition-colors">Submissions</h2>
            <p className="text-sm text-gray-400 mt-1">View your submission history</p>
          </Link>

          {/* Leaderboard */}
          <Link to={`/contest/${contestId}/leaderboard`} className="group bg-surface-800/80 backdrop-blur-sm rounded-xl p-6 border border-surface-700/80 shadow-sm hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4 group-hover:bg-primary-500/20 transition-colors">
              <svg className="w-6 h-6 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 7 7" />
                <path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 17 7" />
                <path d="M4 22h16" />
                <path d="M10 22V2h4v20" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold group-hover:text-primary-400 transition-colors">Leaderboard</h2>
            <p className="text-sm text-gray-400 mt-1">See where you rank among participants</p>
          </Link>
        </div>
      </main>
    </div>
  )
}
