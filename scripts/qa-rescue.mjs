import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://127.0.0.1:4174/'
const captureOnly = process.argv.find(argument => argument.startsWith('--capture='))?.split('=')[1]
const headed = process.argv.includes('--headed')
const softwareRendering = process.argv.includes('--software')
const outputDir = path.resolve('visual-regression/rescue-production')
const viewport = { width: 1194, height: 834 }
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' })

await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  headless: !headed,
  args: softwareRendering ? ['--disable-gpu', '--disable-gpu-compositing'] : [],
})
const errors = []

function observe(page, label) {
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${label}: response ${response.status()}: ${response.url()}`)
  })
  page.on('console', message => {
    if (message.type() === 'error') {
      const location = message.location()
      errors.push(`${label}: console: ${message.text()}${location.url ? ` @ ${location.url}:${location.lineNumber}` : ''}`)
    }
  })
  page.on('pageerror', error => errors.push(`${label}: pageerror: ${error.message}`))
}

async function waitForApp(page) {
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function')
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()))
}

async function waitForScreen(page, screen) {
  await page.waitForFunction(expected => {
    if (typeof window.render_game_to_text !== 'function') return false
    return JSON.parse(window.render_game_to_text()).screen === expected
  }, screen)
  return readState(page)
}

async function capture(page, filename) {
  await page.waitForTimeout(900) // 给图片解码与 Chromium 合成层一次稳定绘制机会
  await page.screenshot({ path: path.join(outputDir, filename), animations: 'disabled' })
}

async function seed(page, { stage = 'intro', paused = false } = {}) {
  await page.evaluate(async ({ stage, paused, today }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('pipienglish')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['kv', 'sessions', 'rescue'], 'readwrite')
      tx.objectStore('kv').put({
        key: 'farmState',
        value: { henName: '咕咕', eggStock: 2, incubating: [], cooking: 'empty' },
      })
      tx.objectStore('kv').put({
        key: 'meta',
        value: { streak: 7, lastDoneDate: null, totalDays: 7, installDate: today },
      })
      tx.objectStore('sessions').put({
        date: today,
        reviewIds: paused ? ['apple', 'banana'] : [],
        newIds: paused ? [] : ['apple', 'banana', 'orange', 'grape'],
        doneCount: 0,
        answered: 0,
        correct: 0,
        completed: false,
        newWordsPaused: paused,
      })
      const rescue = tx.objectStore('rescue')
      rescue.clear()
      if (!paused) rescue.put({ wordId: 'egg', capturedAt: 1, stage })
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  }, { stage, paused, today })
}

async function readRow(page, store, key) {
  return page.evaluate(async ({ store, key }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('pipienglish')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const value = await new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).get(key)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return value
  }, { store, key })
}

async function openSeededContext(options = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, timezoneId: 'Asia/Hong_Kong' })
  const page = await context.newPage()
  observe(page, options.label ?? 'context')
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitForApp(page)
  await seed(page, options)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitForScreen(page, 'farm_home')
  return { context, page }
}

async function enterRescue(page) {
  await page.locator('.rescue-entry-f4').click()
  await page.getByRole('button', { name: '去救援' }).click()
  await page.waitForFunction(() => {
    if (typeof window.render_game_to_text !== 'function') return false
    return JSON.parse(window.render_game_to_text()).screen.startsWith('lesson_')
  })
}

const captureScenarios = [
  ['intro', 'lesson_intro', 'rescue-1-listen-1194x834.png'],
  ['trace', 'lesson_trace_ready', 'rescue-2-trace-1194x834.png'],
  ['choice', 'lesson_choice_ready', 'rescue-3-choice-1194x834.png'],
  ['dictation', 'lesson_dictation_ready', 'rescue-4-dictation-1194x834.png'],
] .filter(([stage]) => !captureOnly || captureOnly === stage)

for (const [stage, expectedScreen, filename] of captureScenarios) {
  const { context, page } = await openSeededContext({ stage, label: `capture-${stage}` })
  await enterRescue(page)
  const state = await waitForScreen(page, expectedScreen)
  assert.equal(state.header.title, `救援 · 第 ${['intro', 'trace', 'choice', 'dictation'].indexOf(stage) + 1} 步 / 4`)
  assert.equal(state.header.progressText, '待救 1 只')
  if (stage === 'intro') assert.equal(state.variant, 'text_first')
  if (stage === 'dictation') assert.ok(!state.controls.includes('skip_unknown'))
  await capture(page, filename)
  await context.close()
}

if (captureOnly === 'farm') {
  const { context, page } = await openSeededContext({ stage: 'intro', label: 'capture-farm' })
  await capture(page, 'farm-rescue-count-1-1194x834.png')
  await context.close()
}

if (captureOnly === 'paused') {
  const { context, page } = await openSeededContext({ paused: true, label: 'capture-paused' })
  await page.getByRole('heading', { name: '连续 7 天！' }).waitFor()
  await page.getByText('今天复习 2 个老朋友。', { exact: true }).waitFor()
  await capture(page, 'paused-task-board-1194x834.png')
  await context.close()
}

if (captureOnly && !['flow', 'offline'].includes(captureOnly)) {
  await browser.close()
  assert.deepEqual(errors, [], `浏览器出现错误：\n${errors.join('\n')}`)
  console.log(`single capture passed: ${captureOnly}`)
  process.exit(0)
}

if (!captureOnly) {
  const { context, page } = await openSeededContext({ paused: true, label: 'paused-board' })
  await page.getByRole('heading', { name: '连续 7 天！' }).waitFor()
  await page.getByText('今天复习 2 个老朋友。', { exact: true }).waitFor()
  await capture(page, 'paused-task-board-1194x834.png')
  await context.close()
}

if (!captureOnly || captureOnly === 'flow') {
  const { context, page } = await openSeededContext({ stage: 'intro', label: 'full-flow' })
  await capture(page, 'farm-rescue-count-1-1194x834.png')
  await enterRescue(page)

  await page.getByRole('button', { name: '我认识它了！' }).click()
  await waitForScreen(page, 'lesson_trace_ready')

  const canvas = page.locator('canvas.lesson-trace-canvas-f4')
  const box = await canvas.boundingBox()
  assert.ok(box)
  await page.mouse.move(box.x + 180, box.y + 130)
  await page.mouse.down()
  await page.mouse.move(box.x + 260, box.y + 170, { steps: 4 })
  await page.mouse.move(box.x + 340, box.y + 120, { steps: 4 })
  await page.mouse.up()
  await page.getByRole('button', { name: '写好了！' }).click()
  await waitForScreen(page, 'lesson_choice_ready')

  let state = await readState(page)
  const correctIndex = state.options.findIndex(option => option.label === '鸡蛋')
  const wrongIndex = state.options.findIndex(option => option.label !== '鸡蛋')
  assert.ok(correctIndex >= 0 && wrongIndex >= 0)
  await page.locator('.lesson-choice-option-f4').nth(wrongIndex).click()
  await waitForScreen(page, 'lesson_choice_retry')
  assert.equal((await readRow(page, 'rescue', 'egg')).stage, 'choice')
  await page.locator('.lesson-choice-option-f4').nth(correctIndex).click()
  await waitForScreen(page, 'lesson_choice_correct')
  await page.getByRole('button', { name: '继续' }).click()
  await waitForScreen(page, 'lesson_dictation_ready')
  assert.equal(await page.getByRole('button', { name: '想不起来' }).count(), 0)

  const input = page.locator('#lesson-dictation-answer')
  await input.fill('eg')
  await page.getByRole('button', { name: '提交答案' }).click()
  await waitForScreen(page, 'lesson_dictation_retry')
  assert.equal((await readRow(page, 'rescue', 'egg')).stage, 'dictation')
  await input.fill('egg')
  await page.getByRole('button', { name: '提交答案' }).click()
  await waitForScreen(page, 'lesson_dictation_correct')
  assert.ok(await readRow(page, 'rescue', 'egg'), '点继续前救援记录必须保留')
  await page.getByRole('button', { name: '继续' }).click()
  state = await waitForScreen(page, 'farm_home')
  assert.equal(state.rescue, 0)
  assert.equal(await readRow(page, 'rescue', 'egg'), null)
  assert.ok((await readRow(page, 'seen', 'egg')).lastSeenAt > 0)
  await capture(page, 'farm-rescue-count-0-1194x834.png')
  await context.close()
}

if (!captureOnly || captureOnly === 'offline') {
  const { context, page } = await openSeededContext({ stage: 'choice', label: 'offline-cold-start' })
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.close()
  await context.setOffline(true)
  const offlinePage = await context.newPage()
  observe(offlinePage, 'offline-cold-start')
  await offlinePage.goto(url, { waitUntil: 'domcontentloaded' })
  await waitForScreen(offlinePage, 'farm_home')
  await enterRescue(offlinePage)
  const state = await waitForScreen(offlinePage, 'lesson_choice_ready')
  assert.equal(state.header.title, '救援 · 第 3 步 / 4')
  assert.equal(await offlinePage.locator('img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).length), 0)
  await capture(offlinePage, 'offline-rescue-choice-1194x834.png')
  await context.close()
}

await browser.close()
assert.deepEqual(errors, [], `浏览器出现错误：\n${errors.join('\n')}`)
console.log('rescue QA passed: stages, retries, atomic completion, paused board, offline cold start, no console errors')
