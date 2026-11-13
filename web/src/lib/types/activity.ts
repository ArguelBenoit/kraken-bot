/** Activité des bots (pastilles du menu) et variables d'environnement définies (jamais leurs valeurs). */
export interface Activity {
  /** gain / loss : nombre de positions ouvertes en gain / en perte au prix actuel. */
  ai: { running: boolean; positions: number; gain: number; loss: number }
  /** Absent si le serveur Python est une ancienne version. */
  backtest?: { running: boolean; paused: boolean }
  manual: { positions: number; pending: number; gain: number; loss: number }
}

interface EnvVar {
  name: string
  set: boolean
}
export interface Connections {
  models: EnvVar[]
  kraken: EnvVar[]
  /** Ollama local : serveur actif et modèles installés. */
  ollama: { up: boolean; models: string[] }
}
