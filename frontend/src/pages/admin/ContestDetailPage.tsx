import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { contestAPI, adminAPI, testcaseAPI, problemAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function ContestDetailPage() {
  const { contestId } = useParams<{ contestId: string }>()
  const [contest, setContest] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [testcaseFile, setTestcaseFile] = useState<File | null>(null)
  const [executable, setExecutable] = useState<File | null>(null)
  const [problemId, setProblemId] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [contestId])

  const loadData = async () => {
    try {
      const [contestRes, statsRes, problemsRes] = await Promise.all([
        contestAPI.get(contestId!),
        adminAPI.getStats(contestId!),
        problemAPI.list(contestId!),
      ])
      setContest(contestRes.data)
      setStats(statsRes.data)
      if (problemsRes.data.length > 0) setProblemId(problemsRes.data[0].id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleStart = async () => {
    await contestAPI.start(contestId!)
    toast.success('Contest started!')
    loadData()
  }

  const handleEnd = async () => {
    await contestAPI.end(contestId!)
    toast.success('Contest ended')
    loadData()
  }

  const handleUploadExecutable = async () => {
    if (!executable) return
    await contestAPI.uploadExecutable(contestId!, executable)
    toast.success('Executable uploaded')
    loadData()
  }

  const handleUploadTestcases = async () => {
    if (!testcaseFile || !problemId) return
    await testcaseAPI.uploadBulk(problemId, testcaseFile)
    toast.success('Test cases uploaded')
    setTestcaseFile(null)
    loadData()
  }

  if (!contest) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="border-b border-surface-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-primary-400 hover:text-primary-300">&larr; Dashboard</Link>
            <h1 className="text-xl font-bold">{contest.name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              contest.status === 'running' ? 'text-green-400 bg-green-400/10' :
              contest.status === 'ended' ? 'text-gray-400 bg-gray-400/10' : 'text-yellow-400 bg-yellow-400/10'
            }`}>{contest.status.toUpperCase()}</span>
          </div>
          <div className="flex gap-2">
            {contest.status === 'draft' && (
              <button onClick={handleStart} className="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-500 transition">Start Contest</button>
            )}
            {contest.status === 'running' && (
              <button onClick={handleEnd} className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 transition">End Contest</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface-800 rounded-xl p-4 border border-surface-700">
              <p className="text-2xl font-bold text-blue-400">{stats.total_participants}</p>
              <p className="text-sm text-gray-400">Participants</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-4 border border-surface-700">
              <p className="text-2xl font-bold text-yellow-400">{stats.total_submissions}</p>
              <p className="text-sm text-gray-400">Submissions</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-4 border border-surface-700">
              <p className="text-2xl font-bold text-green-400">{stats.accepted_submissions}</p>
              <p className="text-sm text-gray-400">Accepted</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-4 border border-surface-700">
              <p className="text-2xl font-bold text-purple-400">{stats.total_testcases}</p>
              <p className="text-sm text-gray-400">Test Cases</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
            <h2 className="text-lg font-semibold mb-4">Upload Executable</h2>
            <input
              type="file"
              accept=".exe,.out,.bin"
              onChange={(e) => setExecutable(e.target.files?.[0] || null)}
              className="w-full text-sm mb-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-surface-700 file:text-gray-200"
            />
            <button onClick={handleUploadExecutable} disabled={!executable} className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 transition disabled:opacity-50">
              Upload
            </button>
            {contest.executable_name && (
              <p className="text-xs text-gray-400 mt-2">Current: {contest.executable_name}</p>
            )}
          </div>

          <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
            <h2 className="text-lg font-semibold mb-4">Upload Test Cases</h2>
            <p className="text-xs text-gray-400 mb-2">CSV format: input,expected_output,test_order,is_sample</p>
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => setTestcaseFile(e.target.files?.[0] || null)}
              className="w-full text-sm mb-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-surface-700 file:text-gray-200"
            />
            <button onClick={handleUploadTestcases} disabled={!testcaseFile || !problemId} className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 transition disabled:opacity-50">
              Upload
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Link to={`/admin/contests/${contestId}/participants`} className="bg-surface-800 rounded-xl p-4 border border-surface-700 hover:border-primary-500 transition text-center">
            <p className="text-lg font-bold">{stats?.total_participants || 0}</p>
            <p className="text-sm text-gray-400">View Participants</p>
          </Link>
          <Link to={`/admin/contests/${contestId}/submissions`} className="bg-surface-800 rounded-xl p-4 border border-surface-700 hover:border-primary-500 transition text-center">
            <p className="text-lg font-bold">{stats?.total_submissions || 0}</p>
            <p className="text-sm text-gray-400">View Submissions</p>
          </Link>
          <Link to={`/admin/contests/${contestId}/leaderboard`} className="bg-surface-800 rounded-xl p-4 border border-surface-700 hover:border-primary-500 transition text-center">
            <p className="text-lg font-bold">{stats?.total_participants || 0}</p>
            <p className="text-sm text-gray-400">View Leaderboard</p>
          </Link>
        </div>
      </main>
    </div>
  )
}
