import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { leaderboardAPI } from '../../services/api'
import type { LeaderboardEntry } from '../../types/api'
import PageHeader from '../../components/PageHeader'
import RankBadge from '../../components/RankBadge'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import EmptyState from '../../components/EmptyState'

export default function LeaderboardPage() {
  const { contestId } = useParams<{ contestId: string }>()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    loadLeaderboard()
    connectWebSocket()
    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [contestId])

  const loadLeaderboard = async () => {
    try {
      const res = await leaderboardAPI.get(contestId!)
      if (mountedRef.current) setEntries(res.data.entries || [])
    } catch (err) {
      console.error(err)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const connectWebSocket = () => {
    if (!mountedRef.current) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.DEV ? 'localhost:8000' : window.location.host
    const ws = new WebSocket(`${protocol}//${host}/ws/contests/${contestId}/leaderboard`)
    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      const msg = JSON.parse(event.data)
      if (msg.type === 'leaderboard_init' || msg.type === 'leaderboard_update') {
        setEntries(msg.data)
      }
    }
    ws.onclose = () => {
      if (mountedRef.current) {
        reconnectTimerRef.current = setTimeout(connectWebSocket, 3000)
      }
    }
    ws.onerror = () => { ws.close() }
    wsRef.current = ws
  }

  const rollNumber = localStorage.getItem('roll_number')

  if (loading) return <LoadingSkeleton variant="table" count={8} />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Leaderboard"
        backLink={`/contest/${contestId}`}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {entries.length === 0 ? (
          <EmptyState
            title="No participants yet"
            description="Leaderboard will populate once participants start submitting solutions."
          />
        ) : (
          <div className="bg-surface-800 rounded-xl border border-surface-700 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-surface-700/50 text-sm font-medium text-gray-400">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Roll No</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-2">Solved</div>
              <div className="col-span-2 text-right">Attempts</div>
            </div>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`grid grid-cols-12 gap-4 px-6 py-3 items-center border-t border-surface-700 text-sm ${
                  entry.roll_number === rollNumber ? 'bg-primary-600/10 border-primary-500/30' : ''
                }`}
              >
                <div className="col-span-1">
                  <RankBadge rank={entry.rank} />
                </div>
                <div className="col-span-3 font-medium truncate">{entry.name}</div>
                <div className="col-span-2 text-gray-400">{entry.roll_number}</div>
                <div className="col-span-2">
                  <span className={`text-xs font-bold ${entry.solved_count === entry.total_problems ? 'text-green-400' : 'text-primary-400'}`}>
                    {entry.total_score}/{entry.max_score}
                  </span>
                </div>
                <div className="col-span-2 text-gray-400">
                  {entry.solved_count}/{entry.total_problems}
                </div>
                <div className="col-span-2 text-right text-gray-400">{entry.attempts}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
