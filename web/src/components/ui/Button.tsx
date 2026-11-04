import type { ComponentPropsWithRef } from 'react'

type Variant = 'primary' | 'sec' | 'ko'
interface Props extends ComponentPropsWithRef<'button'> {
  variant?: Variant
  size?: 'xs' | 'title'
}

/** Bouton aux trois variantes du thème (principal, secondaire, danger) ; de type `button` par défaut pour ne pas soumettre un formulaire. */
export function Button({ variant = 'primary', size, className = '', type = 'button', ...rest }: Props) {
  const cls = ['btn', variant === 'primary' ? '' : variant, size ?? '', className].filter(Boolean).join(' ')
  return <button type={type} className={cls} {...rest} />
}
