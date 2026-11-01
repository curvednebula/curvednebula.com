import test from 'node:test'
import assert from 'node:assert/strict'
import { deploy, parseCommitMessage } from '../scripts/deploy.mjs'

test('deploy accepts a positional commit message and common message flags', () => {
  assert.equal(parseCommitMessage([]), 'new deployment')
  for (const args of [
    ['Improve the screenshot editor'],
    ['-m', 'Improve the screenshot editor'],
    ['--message', 'Improve the screenshot editor'],
    ['--message=Improve the screenshot editor']
  ]) assert.equal(parseCommitMessage(args), 'Improve the screenshot editor')
})

test('invalid or blank messages fail before deployment', () => {
  for (const args of [[''], ['   '], ['-m'], ['--message='], ['--unknown'], ['too', 'many', 'arguments']]) {
    assert.throws(() => parseCommitMessage(args))
  }
})

test('deploy passes punctuation literally and preserves the original deployment order', () => {
  const calls = []
  const message = 'Fix "frame" selection & spacing; $(literal) `text`'
  deploy(parseCommitMessage([message]), (command, args) => calls.push([command, args]), '/test/npm-cli.js')
  assert.deepEqual(calls, [
    [process.execPath, ['/test/npm-cli.js', 'run', 'build']],
    ['git', ['add', '-A']],
    ['git', ['commit', '-m', message]],
    ['git', ['push']],
    ['git', ['subtree', 'push', '--prefix', 'dist', 'origin', 'gh-pages']]
  ])
})

test('a failed build or Git command prevents every later deployment step', () => {
  for (let failAt = 0; failAt < 5; failAt++) {
    const calls = []
    assert.throws(() => deploy('Test commit', (command, args) => {
      calls.push([command, args])
      if (calls.length - 1 === failAt) throw new Error('Simulated failure')
    }, '/test/npm-cli.js'), /Simulated failure/)
    assert.equal(calls.length, failAt + 1)
  }
})
