const STATUS_STYLES: Record<string, string> = {
  draft: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  running: 'text-green-400 bg-green-400/10 border-green-400/20',
  ended: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  archived: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
  accepted: 'text-green-400 bg-green-400/10 border-green-400/20',
  wrong_answer: 'text-red-400 bg-red-400/10 border-red-400/20',
  runtime_error: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  time_limit_exceeded: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  memory_limit_exceeded: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  compile_error: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  pending: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  running_status: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
}

interface StatusBadgeProps {
  status: string
  label?: string
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'
  return (
    <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border ${style}`}>
      {(label || status).replace(/_/g, ' ')}
    </span>
  )
}
