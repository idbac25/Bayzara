'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked?: boolean | 'indeterminate'
  onCheckedChange?: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onCheckedChange, className, disabled }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement>(null)
    const ref = (forwardedRef ?? innerRef) as React.RefObject<HTMLInputElement>

    React.useEffect(() => {
      if (ref.current) {
        ref.current.indeterminate = checked === 'indeterminate'
      }
    }, [checked, ref])

    return (
      <input
        type="checkbox"
        ref={ref}
        checked={checked === 'indeterminate' ? false : !!checked}
        disabled={disabled}
        onChange={e => onCheckedChange?.(e.target.checked)}
        className={cn(
          'h-4 w-4 rounded border-gray-300 accent-[#0F4C81] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      />
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
