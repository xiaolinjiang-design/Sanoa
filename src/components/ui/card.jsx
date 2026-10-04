import { cn } from '../../lib/utils'

function Card({ className, ...props }) {
  return <section className={cn('rounded-[28px] border border-black/[.06] bg-white shadow-[0_1px_2px_rgba(38,35,49,.04)]', className)} {...props} />
}

export { Card }
