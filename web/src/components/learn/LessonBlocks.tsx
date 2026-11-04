import type { Block } from '@/lib/learn/lessons'
import { ExploreWidget } from './ExploreWidget'
import css from './Learn.module.css'
import { RichText } from './RichText'
import { RiskWidget } from './RiskWidget'

const CALLOUT_ICON = { tip: '💡', warn: '⚠', key: '★' } as const

/** Affiche les blocs d'une leçon (texte, listes, règles d'achat/vente, exemples, widgets interactifs…). */
export function LessonBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className={css.prose}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p': return <p key={i}><RichText text={b.text} /></p>
          case 'h': return <h3 key={i}>{b.text}</h3>
          case 'list': return <ul key={i}>{b.items.map((x, j) => <li key={j}><RichText text={x} /></li>)}</ul>
          case 'steps': return <ol key={i} className={css.steps}>{b.items.map((x, j) => <li key={j}><RichText text={x} /></li>)}</ol>
          case 'example': return <div key={i} className={css.example}><RichText text={b.text} /></div>
          case 'callout': return (
            <div key={i} className={`${css.callout} ${css[b.tone]}`}>
              <strong>{CALLOUT_ICON[b.tone]} {b.title}</strong>
              <RichText text={b.text} />
            </div>
          )
          case 'rules': return (
            <div key={i} className={css.rules}>
              <div className={`${css.rule} ${css.buyRule}`}><h4>Quand acheter</h4><ul>{b.buy.map((x, j) => <li key={j}><RichText text={x} /></li>)}</ul></div>
              <div className={`${css.rule} ${css.sellRule}`}><h4>Quand vendre</h4><ul>{b.sell.map((x, j) => <li key={j}><RichText text={x} /></li>)}</ul></div>
            </div>
          )
          case 'pros': return (
            <div key={i} className={css.pros}>
              <div className={`${css.rule} ${css.buyRule}`}><h4>Quand ça marche</h4><ul>{b.good.map((x, j) => <li key={j}><RichText text={x} /></li>)}</ul></div>
              <div className={`${css.rule} ${css.sellRule}`}><h4>Quand ça rate</h4><ul>{b.bad.map((x, j) => <li key={j}><RichText text={x} /></li>)}</ul></div>
            </div>
          )
          case 'widget': return b.id === 'explore' ? <ExploreWidget key={i} /> : <RiskWidget key={i} />
        }
      })}
    </div>
  )
}
