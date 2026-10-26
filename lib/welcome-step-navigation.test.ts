import assert from 'node:assert/strict'
import test from 'node:test'
import { welcomeAdvanceStepOptimistic } from './welcome-step-navigation.ts'

test('welcomeAdvanceStepOptimistic navigates before save resolves', async () => {
  let step = 1
  let saveStarted = false
  let saveResolved = false
  const save = () => new Promise<void>((resolve) => {
    saveStarted = true
    setTimeout(() => {
      saveResolved = true
      resolve()
    }, 50)
  })
  welcomeAdvanceStepOptimistic(() => { step = 2 }, save)
  assert.equal(step, 2)
  assert.equal(saveStarted, true)
  assert.equal(saveResolved, false)
  await new Promise((r) => setTimeout(r, 60))
  assert.equal(saveResolved, true)
})
