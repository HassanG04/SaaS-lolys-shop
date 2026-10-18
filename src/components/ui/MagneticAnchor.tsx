import type { ComponentPropsWithRef } from 'react'
import { magneticHandlers } from './magnetic'

export function MagneticAnchor({ className = '', children, ...props }: ComponentPropsWithRef<'a'>) {
  return (
    <a {...props} {...magneticHandlers(props)} className={`magnetic-control ${className}`}>
      {children}
    </a>
  )
}
