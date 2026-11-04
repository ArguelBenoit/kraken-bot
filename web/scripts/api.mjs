// Lance l'API Flask (app.py) avec le Python du venv ; crée le venv et installe requirements.txt si besoin.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const venv = join(root, '.venv')
const py = join(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

if (!existsSync(py)) {
  console.log('[api] création du venv Python…')
  run(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', '.venv'])
  run(py, ['-m', 'pip', 'install', '-q', '-r', 'requirements.txt'])
}
const child = spawn(py, ['app.py'], { cwd: root, stdio: 'inherit', env: { ...process.env, FLASK_DEBUG: '0' } })
child.on('exit', (code) => process.exit(code ?? 0))
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
