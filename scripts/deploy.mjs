import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const usage = 'Usage: npm run deploy -- "Commit message"\n       npm run deploy -- -m "Commit message"'

export function parseCommitMessage(args) {
  if (!args.length) return 'new deployment'
  let message
  if (args.length === 1 && args[0].startsWith('--message=')) {
    message = args[0].slice('--message='.length)
  } else if (args.length === 2 && ['-m', '--message'].includes(args[0])) {
    message = args[1]
  } else if (args.length === 1 && !args[0].startsWith('-')) {
    message = args[0]
  } else {
    throw new Error(usage)
  }
  if (!message.trim()) throw new Error('The commit message cannot be empty.')
  return message
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: 'inherit', shell: false })
  if (result.error) throw result.error
  if (result.signal) throw new Error(`Command stopped by ${result.signal}.`)
  if (result.status !== 0) throw new Error(`Command failed with exit code ${result.status}. Deployment stopped.`)
}

export function deploy(message, run = runCommand, npmCli = process.env.npm_execpath) {
  if (!npmCli) throw new Error('Start deployment with npm run deploy.')
  // Invoke npm through Node so Windows does not need a shell for npm.cmd.
  // Pass the message as a single argument so punctuation cannot run commands.
  run(process.execPath, [npmCli, 'run', 'build'])
  run('git', ['add', '-A'])
  run('git', ['commit', '-m', message])
  run('git', ['push'])
  run('git', ['subtree', 'push', '--prefix', 'dist', 'origin', 'gh-pages'])
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    if (args.length === 1 && ['--help', '-h'].includes(args[0])) console.log(usage)
    else deploy(parseCommitMessage(args))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
