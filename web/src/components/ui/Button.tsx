import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'sec' | 'ko'
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'xs' | 'title'
}

export function Button({ variant = 'primary', size, className = '', type = 'button', ...rest }: Props) {
  const cls = ['btn', variant === 'primary' ? '' : variant, size ?? '', className].filter(Boolean).join(' ')
  return <button type={type} className={cls} {...rest} />
}
