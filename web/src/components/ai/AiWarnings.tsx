interface Props {
  /** ANTHROPIC_API_KEY définie côté serveur. */
  keyOk: boolean
  live: boolean
  /** Clés Kraken définies (utile seulement en live). */
  liveOk: boolean
  /** Crédit Anthropic épuisé : le bot a été arrêté. */
  creditLow: boolean
}

/** Avertissements en haut des réglages du Bot IA : clé absente, mode LIVE, crédit épuisé. */
export function AiWarnings({ keyOk, live, liveOk, creditLow }: Props) {
  return (
    <>
      {!keyOk && <div className="warn">ANTHROPIC_API_KEY absente : ajoute-la dans .env puis relance le serveur.</div>}
      {live && (
        <div className="warn">
          Mode LIVE : Claude passe de vrais ordres au marché. Jamais testé avec de l&apos;argent réel. Aucun stop n&apos;existe chez Kraken : si ce
          programme s&apos;arrête, rien ne vend.{liveOk ? '' : ' Clés Kraken absentes.'}
        </div>
      )}
      {creditLow && (
        <div className="warn danger">
          Crédit Anthropic épuisé : le bot a été arrêté. Recharge dans la console puis ressaisis ton solde (Coût Claude) et redémarre.
        </div>
      )}
    </>
  )
}
