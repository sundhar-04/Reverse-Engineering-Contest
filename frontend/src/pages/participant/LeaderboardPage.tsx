import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { leaderboardAPI } from '../../services/api'
import type { LeaderboardEntry } from '../../types/api'

export default function LeaderboardPage() {
  const { contestId } = useParams<{ contestId: string }>()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    loadLeaderboard()
    connectWebSocket()
    return () => { wsRef.current?.close() }
  }, [contestId])

  const loadLeaderboard = async () => {
    try {
      const res = await leaderboardAPI.get(contestId!)
      setEntries(res.data.entries || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.DEV ? 'localhost:8000' : window.location.host
    const ws = new WebSocket(`${protocol}//${host}/ws/contests/${contestId}/leaderboard`)
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'leaderboard_init' || msg.type === 'leaderboard_update') {
        setEntries(msg.data)
      }
    }
    ws.onclose = () => {
      setTimeout(connectWebSocket, 3000)
    }
    wsRef.current = ws
  }

  const rollNumber = localStorage.getItem('roll_number')

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="border-b border-surface-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to={`/contest/${contestId}`} className="text-primary-400 hover:text-primary-300">&larr; Dashboard</Link>
          <h1 className="text-xl font-bold">Leaderboard</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No participants yet</div>
        ) : (
          <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-surface-700/50 text-sm font-medium text-gray-400">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Name</div>
              <div className="col-span-2">Roll No</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-center">Attempts</div>
              <div className="col-span-2 text-right">Last Submission</div>
            </div>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`grid grid-cols-12 gap-4 px-6 py-3 items-center border-t border-surface-700 text-sm ${
                  entry.roll_number === rollNumber ? 'bg-primary-600/10 border-primary-500/30' : ''
                }`}
              >
                <div className="col-span-1 font-bold">
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                </div>
                <div className="col-span-4 font-medium truncate">{entry.name}</div>
                <div className="col-span-2 text-gray-400">{entry.roll_number}</div>
                <div className="col-span-2">
                  {entry.is_accepted ? (
                    <span className="text-green-400 text-xs font-medium">✓ Accepted</span>
                  ) : (
                    <span className="text-yellow-400 text-xs">Pending</span>
                  )}
                </div>
                <div className="col-span-1 text-center text-gray-400">{entry.attempts}</div>
                <div className="col-span-2 text-right text-xs text-gray-500">
                  {entry.last_submission_time
                    ? new Date(entry.last_submission_time).toLocaleTimeString()
                    : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
