import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { participantAPI, contestAPI } from '../../services/api'
import toast from 'react-hot-toast'
import LoadingSkeleton from '../../components/LoadingSkeleton'

export default function JoinContestPage() {
  const [contests, setContests] = useState<{ id: string; name: string }[]>([])
  const [contestsLoading, setContestsLoading] = useState(true)
  const [contestId, setContestId] = useState('')
  const [name, setName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    contestAPI.getActive()
      .then((res) => setContests(res.data))
      .catch(() => {})
      .finally(() => setContestsLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contestId) { toast.error('Select a contest'); return }
    setLoading(true)
    try {
      localStorage.removeItem('admin_token')
      if (isLogin) {
        const res = await participantAPI.getByRoll(contestId, rollNumber)
        toast.success('Login successful!')
        localStorage.setItem('participant_id', res.data.id)
        localStorage.setItem('contest_id', contestId)
        localStorage.setItem('participant_name', res.data.name)
        localStorage.setItem('roll_number', rollNumber)
        navigate(`/contest/${contestId}`)
      } else {
        const res = await participantAPI.join({ contest_id: contestId, name, roll_number: rollNumber, department })
        toast.success('Joined contest successfully!')
        localStorage.setItem('participant_id', res.data.participant_id)
        localStorage.setItem('contest_id', contestId)
        localStorage.setItem('participant_name', name)
        localStorage.setItem('roll_number', rollNumber)
        localStorage.setItem('department', department)
        navigate(`/contest/${contestId}`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || (isLogin ? 'Login failed' : 'Failed to join contest'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-primary-400 font-mono">ReverseCode Arena</Link>
          <p className="text-gray-400 mt-2">{isLogin ? 'Login to Contest' : 'Join a Contest'}</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-surface-800 rounded-xl p-8 space-y-5 border border-surface-700 shadow-sm">
          <div>
            <label className="block text-sm font-medium mb-1.5">Contest</label>
            {contestsLoading ? (
              <div className="h-10 bg-surface-900 rounded-lg animate-pulse" />
            ) : (
              <select
                value={contestId}
                onChange={(e) => setContestId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
                required
              >
                <option value="">-- Select a contest --</option>
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {!contestsLoading && contests.length === 0 && (
              <p className="text-xs text-yellow-400 mt-1">No active contests available right now</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Roll Number</label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
              required
            />
          </div>
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
                  required
                />
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 transition disabled:opacity-50 font-medium shadow-sm flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? (isLogin ? 'Logging in...' : 'Joining...') : (isLogin ? 'Login' : 'Join Contest')}
          </button>
          <div className="text-center text-sm text-gray-400">
            {isLogin ? (
              <span onClick={() => setIsLogin(false)} className="text-primary-400 hover:underline cursor-pointer">
                New participant? Join instead
              </span>
            ) : (
              <span onClick={() => setIsLogin(true)} className="text-primary-400 hover:underline cursor-pointer">
                Already registered? Login instead
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
