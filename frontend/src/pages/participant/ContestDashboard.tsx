import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { contestAPI, problemAPI } from '../../services/api'
import type { Contest, Problem } from '../../types/api'

export default function ContestDashboard() {
  const { contestId } = useParams<{ contestId: string }>()
  const navigate = useNavigate()
  const [contest, setContest] = useState<Contest | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
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
      if (problemRes.data.length > 0) setProblem(problemRes.data[0])

      const statusRes = await contestAPI.status(contestId!)
      if (statusRes.data.time_remaining) setTimeRemaining(statusRes.data.time_remaining)
    } catch (err) {
      console.error(err)
    }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
  }

  if (!contest) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="border-b border-surface-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{contest.name}</h1>
            <p className="text-sm text-gray-400">Welcome, {participantName}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-400">Status</p>
              <span className={`text-sm font-medium ${contest.status === 'running' ? 'text-green-400' : 'text-yellow-400'}`}>
                {contest.status.toUpperCase()}
              </span>
            </div>
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Time Remaining</p>
                <p className="text-sm font-mono text-primary-400">{formatTime(timeRemaining)}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to={`/contest/${contestId}/ide`} className="bg-surface-800 rounded-xl p-6 border border-surface-700 hover:border-primary-500 transition group">
            <div className="text-3xl mb-3">💻</div>
            <h2 className="text-lg font-semibold group-hover:text-primary-400 transition">Code Editor</h2>
            <p className="text-sm text-gray-400 mt-1">Write and test your Python solution</p>
          </Link>

          {contest.executable_url && (
            <button
              onClick={async () => {
                try {
                  const res = await contestAPI.downloadExecutable(contestId!)
                  const url = URL.createObjectURL(new Blob([res.data]))
                  const a = document.createElement('a')
                  a.href = url
                  a.download = contest.executable_name || 'executable.exe'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (err) {
                  console.error(err)
                }
              }}
              className="bg-surface-800 rounded-xl p-6 border border-surface-700 hover:border-primary-500 transition text-left group"
            >
              <div className="text-3xl mb-3">⬇️</div>
              <h2 className="text-lg font-semibold group-hover:text-primary-400 transition">Download Executable</h2>
              <p className="text-sm text-gray-400 mt-1">{contest.executable_name || 'executable.exe'}</p>
            </button>
          )}

          <Link to={`/contest/${contestId}/submissions`} className="bg-surface-800 rounded-xl p-6 border border-surface-700 hover:border-primary-500 transition group">
            <div className="text-3xl mb-3">📝</div>
            <h2 className="text-lg font-semibold group-hover:text-primary-400 transition">Submissions</h2>
            <p className="text-sm text-gray-400 mt-1">View your submission history</p>
          </Link>

          <Link to={`/contest/${contestId}/leaderboard`} className="bg-surface-800 rounded-xl p-6 border border-surface-700 hover:border-primary-500 transition group">
            <div className="text-3xl mb-3">🏆</div>
            <h2 className="text-lg font-semibold group-hover:text-primary-400 transition">Leaderboard</h2>
            <p className="text-sm text-gray-400 mt-1">See where you rank among participants</p>
          </Link>

          {problem && (
            <div className="bg-surface-800 rounded-xl p-6 border border-surface-700 md:col-span-1">
              <div className="text-3xl mb-3">📄</div>
              <h2 className="text-lg font-semibold">Problem Details</h2>
              <p className="text-sm text-gray-400 mt-1">{problem.title}</p>
              {problem.executable_name && (
                <p className="text-xs text-gray-500 mt-1">Executable: {problem.executable_name}</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
