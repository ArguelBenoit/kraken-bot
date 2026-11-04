import { Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { fm } from '@/lib/format'
import { LEARN_PAIRS, LEARN_TFS } from '@/lib/learn/data'
import { START_CASH } from '@/lib/learn/sim'
import css from './Learn.module.css'

interface Props {
  instruction: string
  /** L'exercice suit une méthode : on choisit un moment où elle donne un signal d'achat. */
  withMethod: boolean
  pair: string
  tf: number
  loading: boolean
  onPair: (pair: string) => void
  onTf: (tf: number) => void
  onStart: () => void
}

/** Écran de préparation d'un exercice : consigne, choix de la crypto et de la durée des bougies. */
export function PracticeSetup({ instruction, withMethod, pair, tf, loading, onPair, onTf, onStart }: Props) {
  return (
    <Card title="À toi de jouer" icon={Play}>
      <div className={css.prose}>
        <p>{instruction}</p>
        <p className="t-mu">
          On te donne un <b>vrai moment passé du marché</b>, tiré au hasard : tu vois ce qui précède, jamais la suite. Tu avances bougie par bougie et tu décides.
          {withMethod && <> Pour cette méthode, on choisit un moment où <b>un signal d&apos;achat apparaît</b> peu après le départ.</>}
          {' '}Tout est <b>simulé</b> avec {fm(START_CASH, 0)} € fictifs : aucun argent réel, aucun ordre envoyé.
        </p>
      </div>
      <Field label="Crypto">
        <select value={pair} onChange={(e) => onPair(e.target.value)}>
          {LEARN_PAIRS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <Field label="Durée d'une bougie">
        <select value={tf} onChange={(e) => onTf(Number(e.target.value))}>
          {LEARN_TFS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <div className="row"><Button onClick={onStart} disabled={loading}>{loading ? 'Chargement…' : 'Démarrer l’exercice'}</Button></div>
    </Card>
  )
}
