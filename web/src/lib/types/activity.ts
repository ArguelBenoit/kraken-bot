/** Activité des bots (pastilles du menu) et variables d'environnement définies (jamais leurs valeurs). */
export interface Activity {
  /** gain / loss : nombre de positions ouvertes en gain / en perte au prix actuel. */
  ai: { running: boolean; positions: number; gain: number; loss: number }
  manual: { positions: number; pending: number; gain: number; loss: number }
}

interface EnvVar {
  name: string
  set: boolean
}
export interface Connections {
  models: EnvVar[]
  kraken: EnvVar[]
}
