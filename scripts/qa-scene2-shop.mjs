import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://127.0.0.1:4175/'
const outputDir = path.resolve('visual-regression/scene-2-shop-production')
const viewport = { width: 1194, height: 834 }
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' })
const itemNames = [
  '苹果花篮',
  '苹果木箱',
  '果汁陶壶',
  '果园提灯',
  '田野长椅',
  '苹果收获车',
  '苹果分拣桌',
  '苹果园风车',
  '苹果树秋千',
]
const placements = [
  ['scene-2-flower-basket', 590, 795],
  ['scene-2-apple-crate', 710, 795],
  ['scene-2-cider-jugs', 820, 790],
  ['scene-2-orchard-lantern', 935, 790],
  ['scene-2-field-bench', 560, 705],
  ['scene-2-harvest-cart', 760, 700],
  ['scene-2-sorting-table', 980, 700],
  ['scene-2-windmill-landmark', 910, 580],
  ['scene-2-apple-tree-swing-landmark', 510, 625],
]

await fs.mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport, deviceScaleFactor: 1, timezoneId: 'Asia/Hong_Kong' })
const page = await context.newPage()
const errors = []
page.on('response', response => {
  if (response.status() >= 400) errors.push(`response ${response.status()}: ${response.url()}`)
})
page.on('console', message => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))

async function state() {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()))
}

async function waitForFarm() {
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function')
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).state !== 'loading')
}

async function seedSceneTwo() {
  await page.evaluate(async ({ today }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('pipienglish')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['kv', 'sessions', 'decorations', 'rescue'], 'readwrite')
      tx.objectStore('kv').put({
        key: 'farmState',
        value: {
          henName: '咕咕',
          eggStock: 200,
          incubating: null,
          cookingMeal: null,
          activeSceneId: 'scene-2',
          acknowledgedSceneChapter: 2,
          normalHatchStreak: 0,
          nonSpecialHatchStreak: 0,
        },
      })
      tx.objectStore('kv').put({ key: 'meta', value: { streak: 12, lastDoneDate: today, totalDays: 36, installDate: today } })
      tx.objectStore('kv').put({ key: 'settings', value: { motionEnabled: false, musicEnabled: false } })
      tx.objectStore('sessions').put({
        date: today,
        reviewIds: [],
        newIds: [],
        doneCount: 0,
        answered: 0,
        correct: 0,
        completed: true,
      })
      tx.objectStore('decorations').clear()
      tx.objectStore('rescue').clear()
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  }, { today })
}

async function seedPlacements() {
  await page.evaluate(async ({ placements }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('pipienglish')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise((resolve, reject) => {
      const tx = db.transaction('decorations', 'readwrite')
      const store = tx.objectStore('decorations')
      for (const [itemId, x, y] of placements) store.put({ sceneId: 'scene-2', itemId, x, y })
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  }, { placements })
}

await page.goto(url, { waitUntil: 'domcontentloaded' })
await waitForFarm()
await seedSceneTwo()
await page.reload({ waitUntil: 'domcontentloaded' })
await waitForFarm()

let snapshot = await state()
assert.equal(snapshot.scene, 'scene-2')
assert.equal(snapshot.viewedScene, 'scene-2')
assert.equal(snapshot.eggs, 200)
assert.equal(snapshot.listedDecorations, 9)

await page.getByRole('button', { name: '布置农场' }).click()
await page.getByRole('region', { name: '苹果园装饰商店' }).waitFor()
const cards = page.locator('.customization-grid-f7 article')
assert.equal(await cards.count(), 9)
for (const name of itemNames) await page.getByRole('strong').filter({ hasText: name }).waitFor()
await page.waitForFunction(() => {
  const images = [...document.querySelectorAll('.customization-item-preview-f7 img')]
  return images.length === 9 && images.every(image => image.complete && image.naturalWidth > 0)
})
assert.equal(await page.locator('.customization-item-preview-f7 img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true)
await page.screenshot({ path: path.join(outputDir, 'scene-2-decoration-shop-1194x834.png'), animations: 'disabled' })

for (const name of itemNames) {
  const card = cards.filter({ hasText: name })
  await card.getByRole('button', { name: '购买' }).click()
  await card.getByRole('button', { name: '摆出来' }).waitFor()
}
snapshot = await state()
assert.equal(snapshot.eggs, 110)
assert.equal(await page.getByRole('button', { name: '摆出来' }).count(), 9)

await page.getByRole('button', { name: '关闭', exact: true }).click()
await seedPlacements()
await page.reload({ waitUntil: 'domcontentloaded' })
await waitForFarm()
snapshot = await state()
assert.equal(snapshot.eggs, 110)
assert.equal(snapshot.listedDecorations, 9)
assert.equal(snapshot.placedDecorations, 9)
assert.equal(await page.locator('.farm-decoration-f7 img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight === image.naturalWidth)), true)
assert.equal(await page.locator('.scene-fixed-visual-wrap-f4[aria-label*="旅行路牌"]').count(), 1)
await page.screenshot({ path: path.join(outputDir, 'scene-2-all-decorations-placed-1194x834.png'), animations: 'disabled' })

assert.deepEqual(errors, [])
await context.close()
await browser.close()
console.log(JSON.stringify({ listed: 9, purchasedEggs: 90, remainingEggs: 110, placed: 9, screenshots: 2 }, null, 2))
