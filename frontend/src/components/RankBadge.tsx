interface RankBadgeProps {
  rank: number
}

export default function RankBadge({ rank }: RankBadgeProps) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-xs font-bold shadow-sm">
        1
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800 text-xs font-bold shadow-sm">
        2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white text-xs font-bold shadow-sm">
        3
      </span>
    )
  }
  return <span className="text-sm text-gray-400 font-mono">#{rank}</span>
}
