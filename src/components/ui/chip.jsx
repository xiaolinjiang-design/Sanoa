import { cn } from '../../lib/utils'

function Chip({ className, ...props }) {
  return (
    <span
      className={cn('inline-flex min-h-9 items-center rounded-full px-3 text-xs font-bold tabular-nums', className)}
      {...props}
    />
  )
}

export { Chip }
