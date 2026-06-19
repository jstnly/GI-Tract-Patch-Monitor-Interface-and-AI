import { useEffect, useState } from 'react'

/** Live wall clock, updated once a second. */
export function Clock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const d = new Date(now)
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return (
    <span className={className}>
      {date} · {time}
    </span>
  )
}
