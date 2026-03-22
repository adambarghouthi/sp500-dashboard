import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-[rgba(255,255,255,0.1)] bg-[#0F0F11]',
          'px-3 py-2 text-sm font-mono text-[#E2E8F0]',
          'shadow-sm placeholder:text-[#64748B]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber focus-visible:border-amber/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-none',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
