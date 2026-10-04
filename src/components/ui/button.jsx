import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-[transform,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss focus-visible:ring-offset-2 active:scale-[.98] disabled:pointer-events-none disabled:bg-stone-200 disabled:text-stone-500',
  {
    variants: {
      variant: {
        default: 'bg-ink text-white shadow-[0_2px_0_rgba(0,0,0,.10),0_8px_16px_rgba(38,35,49,.14)] hover:bg-[#17151f]',
        outline: 'border border-black/[.08] bg-white text-ink shadow-sm hover:bg-stone-50',
        ghost: 'text-ink hover:bg-black/[.05]',
      },
      size: { default: 'h-12', icon: 'h-11 w-11 p-0', lg: 'h-14 px-6 text-base' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
