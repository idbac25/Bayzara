'use client'

import { useState } from 'react'
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  message: string
  type: string
}

const STYLES: Record<string, { bg: string; text: string; border: string; Icon: React.ElementType }> = {
  info:    { bg: 'bg-blue-50',   text: 'text-blue-800',  border: 'border-blue-200',  Icon: Info },
  warning: { bg: 'bg-amber-50',  text: 'text-amber-800', border: 'border-amber-200', Icon: AlertTriangle },
  success: { bg: 'bg-green-50',  text: 'text-green-800', border: 'border-green-200', Icon: CheckCircle },
  error:   { bg: 'bg-red-50',    text: 'text-red-800',   border: 'border-red-200',   Icon: AlertCircle },
}

export function AnnouncementBanner({ message, type }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const style = STYLES[type] ?? STYLES.info
  const { Icon } = style

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b text-sm font-medium ${style.bg} ${style.text} ${style.border}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <p className="flex-1">{message}</p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
