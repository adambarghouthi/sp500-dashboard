import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono',
  {
    variants: {
      variant: {
        default:
          'border-[rgba(240,180,41,0.3)] bg-[rgba(240,180,41,0.1)] text-amber hover:bg-[rgba(240,180,41,0.2)]',
        gain:
          'border-[rgba(22,163,74,0.3)] bg-[rgba(22,163,74,0.1)] text-gain hover:bg-[rgba(22,163,74,0.2)]',
        loss:
          'border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.1)] text-loss hover:bg-[rgba(220,38,38,0.2)]',
        neutral:
          'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[#64748B] hover:bg-[rgba(255,255,255,0.08)]',
        sector:
          'border-[rgba(96,165,250,0.3)] bg-[rgba(96,165,250,0.1)] text-[#60A5FA] hover:bg-[rgba(96,165,250,0.2)]',
        outline:
          'border-[rgba(255,255,255,0.15)] text-[#E2E8F0] bg-transparent',
        open:
          'border-[rgba(22,163,74,0.4)] bg-[rgba(22,163,74,0.15)] text-gain',
        closed:
          'border-[rgba(100,116,139,0.3)] bg-[rgba(100,116,139,0.1)] text-[#64748B]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
