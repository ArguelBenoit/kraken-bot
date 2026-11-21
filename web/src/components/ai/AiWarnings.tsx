interface Props {
  /** Clé du fournisseur choisi définie côté serveur, et nom de sa variable. */
  keyOk: boolean
  keyEnv: string
  /** Crédit ou quota du fournisseur épuisé : le bot a été arrêté. */
  creditLow: boolean
}

/** Avertissements en haut des réglages du Bot IA : clé du modèle absente, crédit épuisé. */
export function AiWarnings({ keyOk, keyEnv, creditLow }: Props) {
  return (
    <>
      {!keyOk && <div className="warn">{keyEnv} absente : ajoute-la dans .env puis relance le serveur.</div>}
      {creditLow && (
        <div className="warn danger">
          Crédit ou quota du fournisseur épuisé : le bot a été arrêté. Recharge ton compte (ou change de modèle) puis redémarre.
        </div>
      )}
    </>
  )
}
