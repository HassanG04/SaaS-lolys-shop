import { Button, type ButtonProps } from './Button'

type IconButtonProps = Omit<ButtonProps, 'size'> & {
  'aria-label': string
  directional?: boolean
}

export function IconButton({ children, directional = false, ...props }: IconButtonProps) {
  return (
    <Button {...props} size="icon">
      <span aria-hidden="true" className={`inline-flex ${directional ? 'rtl:-scale-x-100' : ''}`}>
        {children}
      </span>
    </Button>
  )
}
