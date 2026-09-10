import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://127.0.0.1:4175/'
const outputDir = path.resolve('visual-regression/scene-2-wardrobe-production')
const viewport = { width: 1194, height: 834 }
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' })
const items = [
  ['小皮 苹果花短发', 'xiaopi-hair-scene-2-extension'],
  ['小皮 果园头巾', 'xiaopi-hat-look-scene-2-extension'],
  ['小皮 采果背带裤', 'xiaopi-outfit-scene-2-extension'],
  ['小皮 苹果斜挎包', 'xiaopi-accessory-scene-2-extension'],
  ['母鸡 果园小软帽', 'mother-headwear-scene-2-core'],
  ['母鸡 格纹小领巾', 'mother-neckwear-scene-2-extension'],
]
const equippedNames = new Set(items.slice(1).map(([name]) => name))
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
      const tx = db.transaction(['kv', 'sessions', 'cosmetics', 'decorations', 'rescue'], 'readwrite')
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
      tx.objectStore('kv').put({
        key: 'loadout',
        value: {
          xiaopi: {
            headLook: 'xiaopi-headlook-default-straw-hat-f4',
            outfit: 'xiaopi-outfit-default-blue-overalls-f4',
            accessory: null,
          },
          mother: { headwear: null, neckwear: null },
        },
      })
      tx.objectStore('sessions').put({
        date: today,
        reviewIds: [],
        newIds: [],
        doneCount: 0,
        answered: 0,
        correct: 0,
        completed: true,
      })
      tx.objectStore('cosmetics').clear()
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
assert.equal(snapshot.listedCosmetics, 6)

await page.getByRole('button', { name: '打开衣柜' }).click()
const wardrobe = page.getByRole('region', { name: '角色衣柜' })
await wardrobe.waitFor()
const cards = wardrobe.locator('.customization-grid-f7 article')
assert.equal(await cards.count(), 6)
await page.waitForFunction(() => {
  const images = [...document.querySelectorAll('.customization-item-preview-f7 img')]
  return images.length === 6 && images.every(image => image.complete && image.naturalWidth === 1254 && image.naturalHeight === 1254)
})
assert.equal(await wardrobe.locator('.customization-item-preview-f7 img').evaluateAll(images => (
  images.every(image => image.complete && image.naturalWidth === 1254 && image.naturalHeight === 1254)
)), true)
await page.screenshot({ path: path.join(outputDir, 'scene-2-wardrobe-shop-1194x834.png'), animations: 'disabled' })

for (const [name] of items) {
  const card = cards.filter({ hasText: name })
  await card.getByRole('button', { name: '购买' }).click()
  await card.getByRole('button', { name: '穿上' }).waitFor()
}
snapshot = await state()
assert.equal(snapshot.eggs, 120)

for (const [name] of items) {
  if (!equippedNames.has(name)) continue
  const card = cards.filter({ hasText: name })
  await card.getByRole('button', { name: '穿上' }).click()
  await card.getByRole('button', { name: '换回默认' }).waitFor()
}

snapshot = await state()
assert.deepEqual(snapshot.loadout, {
  xiaopi: {
    headLook: 'xiaopi-hat-look-scene-2-extension',
    outfit: 'xiaopi-outfit-scene-2-extension',
    accessory: 'xiaopi-accessory-scene-2-extension',
  },
  mother: {
    headwear: 'mother-headwear-scene-2-core',
    neckwear: 'mother-neckwear-scene-2-extension',
  },
})
await page.waitForFunction(() => {
  const images = [...document.querySelectorAll('.wardrobe-character-preview-f7')]
  return images.length === 2 && images.every(image => image.complete && image.naturalWidth === 1254 && image.naturalHeight === 1254)
})
assert.equal(await wardrobe.locator('.wardrobe-character-preview-f7').evaluateAll(images => (
  images.every(image => image.complete && image.naturalWidth === 1254 && image.naturalHeight === 1254)
)), true)
await page.screenshot({ path: path.join(outputDir, 'scene-2-wardrobe-equipped-1194x834.png'), animations: 'disabled' })

await page.getByRole('button', { name: '关闭', exact: true }).click()
await seedPlacements()
await page.reload({ waitUntil: 'domcontentloaded' })
await waitForFarm()
const mother = page.locator('.actor-f3[data-kind="mother"] .sprite-f3')
const xiaopi = page.locator('.actor-f3[data-kind="farmer"] .sprite-f3')
await page.waitForFunction(() => {
  const mother = document.querySelector('.actor-f3[data-kind="mother"] .sprite-f3')
  const xiaopi = document.querySelector('.actor-f3[data-kind="farmer"] .sprite-f3')
  return mother?.getAttribute('src')?.includes('mother-bonnet-neckerchief.png')
    && xiaopi?.getAttribute('src')?.includes('xiaopi-bonnet-overalls-satchel.png')
    && mother.complete && mother.naturalWidth === 1254
    && xiaopi.complete && xiaopi.naturalWidth === 1254
})
assert.match(await mother.getAttribute('src'), /mother-bonnet-neckerchief\.png$/)
assert.match(await xiaopi.getAttribute('src'), /xiaopi-bonnet-overalls-satchel\.png$/)
assert.equal(await mother.evaluate(image => image.complete && image.naturalWidth === 1254 && image.naturalHeight === 1254), true)
assert.equal(await xiaopi.evaluate(image => image.complete && image.naturalWidth === 1254 && image.naturalHeight === 1254), true)
assert.equal((await state()).placedDecorations, 9)
await page.screenshot({ path: path.join(outputDir, 'scene-2-complete-shop-and-wardrobe-equipped-1194x834.png'), animations: 'disabled' })

await page.reload({ waitUntil: 'domcontentloaded' })
await waitForFarm()
snapshot = await state()
assert.equal(snapshot.eggs, 120)
assert.equal(snapshot.listedCosmetics, 6)
assert.deepEqual(snapshot.loadout, {
  xiaopi: {
    headLook: 'xiaopi-hat-look-scene-2-extension',
    outfit: 'xiaopi-outfit-scene-2-extension',
    accessory: 'xiaopi-accessory-scene-2-extension',
  },
  mother: {
    headwear: 'mother-headwear-scene-2-core',
    neckwear: 'mother-neckwear-scene-2-extension',
  },
})
assert.match(await page.locator('.actor-f3[data-kind="farmer"] .sprite-f3').getAttribute('src'), /xiaopi-bonnet-overalls-satchel\.png$/)
assert.match(await page.locator('.actor-f3[data-kind="mother"] .sprite-f3').getAttribute('src'), /mother-bonnet-neckerchief\.png$/)

assert.deepEqual(errors, [])
await context.close()
await browser.close()
console.log(JSON.stringify({ listed: 6, purchasedEggs: 80, remainingEggs: 120, equippedSlots: 5, placedDecorations: 9, persisted: true, screenshots: 3 }, null, 2))
