interface Props {
  /** Clé du fournisseur choisi définie côté serveur, et nom de sa variable. */
  keyOk: boolean
  keyEnv: string
  live: boolean
  /** Clés Kraken définies (utile seulement en live). */
  liveOk: boolean
  /** Crédit ou quota du fournisseur épuisé : le bot a été arrêté. */
  creditLow: boolean
}

/** Avertissements en haut des réglages du Bot IA : clé absente, mode LIVE, crédit épuisé. */
export function AiWarnings({ keyOk, keyEnv, live, liveOk, creditLow }: Props) {
  return (
    <>
      {!keyOk && <div className="warn">{keyEnv} absente : ajoute-la dans .env puis relance le serveur.</div>}
      {live && (
        <div className="warn">
          Mode LIVE : le modèle passe de vrais ordres au marché. Jamais testé avec de l&apos;argent réel. Le stop loss (ou à défaut le stop suiveur) est posé chez Kraken, jamais
          vérifié en réel ; l&apos;objectif reste local : s&apos;il s&apos;arrête, il ne se déclenche pas.{liveOk ? '' : ' Clés Kraken absentes.'}
        </div>
      )}
      {creditLow && (
        <div className="warn danger">
          Crédit ou quota du fournisseur épuisé : le bot a été arrêté. Recharge ton compte (ou change de modèle) puis redémarre.
        </div>
      )}
    </>
  )
}
