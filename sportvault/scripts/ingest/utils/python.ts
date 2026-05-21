import { execSync, spawn } from 'child_process'

export function findPython(): string {
  const pyenvPy = `${process.env.HOME}/.pyenv/versions/3.11.14/bin/python3.11`
  const candidates = [pyenvPy, 'python3.11', 'python3', 'python']
  return candidates.find(p => {
    try {
      execSync(`${p} --version`, { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  }) ?? 'python3'
}

export function runPythonScript(scriptPath: string, args: string[]): Promise<void> {
  const py = findPython()
  return new Promise((resolve, reject) => {
    const child = spawn(py, [scriptPath, ...args], { stdio: 'inherit' })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`Python exited with code ${code}`))
    })
  })
}
