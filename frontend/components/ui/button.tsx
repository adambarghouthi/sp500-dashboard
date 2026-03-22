import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-mono',
  {
    variants: {
      variant: {
        default:
          'bg-amber text-background hover:bg-amber/90 font-semibold',
        amber:
          'bg-amber text-[#0A0A0C] hover:bg-[#FFD700] font-semibold shadow-[0_0_20px_-5px_rgba(240,180,41,0.4)] hover:shadow-[0_0_30px_-5px_rgba(240,180,41,0.6)] transition-all',
        destructive:
          'bg-loss text-white hover:bg-loss/90',
        outline:
          'border border-[rgba(255,255,255,0.12)] bg-transparent hover:bg-[rgba(255,255,255,0.05)] hover:text-[#E2E8F0] text-[#E2E8F0]',
        secondary:
          'bg-[#1A1A1E] text-[#E2E8F0] hover:bg-[#242428] border border-[rgba(255,255,255,0.08)]',
        ghost:
          'hover:bg-[rgba(255,255,255,0.05)] text-[#E2E8F0] hover:text-[#F0B429]',
        link:
          'text-amber underline-offset-4 hover:underline',
        gain:
          'bg-gain/10 text-gain border border-gain/30 hover:bg-gain/20',
        loss:
          'bg-loss/10 text-loss border border-loss/30 hover:bg-loss/20',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8 text-base',
        xl: 'h-12 rounded-md px-10 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
