// 全屏视觉层守卫(2026-07-19 爸爸反馈「背景上有一圈比背景略小的半透明阴影」后加)。
// 作为 npm run build 的前置检查:违规直接挡住构建与部署。
//
//   node scripts/check-fullbleed-layers.mjs
//
// 背景:舞台 .f4-stage 是固定 1194×834 的坐标系,按设备缩放后 letterbox 居中;
// 背景图由 .f4-bleed 铺满整个视口。因此任何**意在盖住整个屏幕**的着色层
// (采光渐变、面板遮罩、夜景色调……)若画在舞台里,letterbox 露出的背景不会被覆盖,
// 屏幕上就会出现一圈矩形接缝。这类问题已复发两次:
//   2006ec1  背景被画两遍的拼接缝
//   F4-CHG-028  .f4-home::before 采光渐变 + .panel-backdrop-f4 面板遮罩
// 每新增一个场景或面板都可能再犯,故用构建门禁钉死。

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const STYLE_DIR = join(process.cwd(), 'src/styles/f4')

/** 本身就在视口层,不受 letterbox 影响,允许铺满着色 */
const VIEWPORT_LAYER = /(^|[\s,>])\.f4-(viewport|bleed)\b/

/** 例外必须写明理由 */
const ALLOWED = [
  // 只做「点空白处关闭」的命中区,压暗由 .f4-bleed::after 在视口层完成
  '.panel-backdrop-f4',
]

function parseRules(css, file) {
  const rules = []
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const pattern = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = pattern.exec(stripped)) !== null) {
    rules.push({ file, selector: match[1].trim().replace(/\s+/g, ' '), body: match[2] })
  }
  return rules
}

const coversParent = body =>
  /\binset:\s*0\b/.test(body)
  || ['top', 'right', 'bottom', 'left'].every(side => new RegExp(`\\b${side}:\\s*0`).test(body))

function paintsColor(body) {
  const declarations = body.match(/background(-color|-image)?:[^;]+/g) ?? []
  return declarations.some(declaration => {
    const value = declaration.split(':').slice(1).join(':').trim()
    if (/^(transparent|none|inherit|initial|unset)$/i.test(value)) return false
    if (/rgba\([^)]*,\s*0\s*\)/i.test(value) && !/gradient/i.test(value)) return false
    return /#|rgb|hsl|gradient|var\(/i.test(value)
  })
}

/**
 * 舞台根 = 直接铺满舞台的屏幕根:显式写 1194×834 的屏幕容器,
 * 外加 inset:0 的 .f4-home / .f4-stage__content。
 * 只有铺满舞台根的层才会露边;铺满进度条、纸卡等小容器是正常写法。
 */
function stageRootSelectors(rules) {
  const roots = new Set(['.f4-home', '.f4-stage__content'])
  for (const rule of rules) {
    if (/\bwidth:\s*1194px/.test(rule.body) && /\bheight:\s*834px/.test(rule.body)) {
      for (const part of rule.selector.split(',')) roots.add(part.trim())
    }
  }
  return roots
}

const isStageWideLayer = (selector, roots) =>
  [...roots].some(root => selector !== root && (selector.startsWith(`${root}::`) || selector.startsWith(`${root} > `)))

const files = readdirSync(STYLE_DIR).filter(name => name.endsWith('.css'))
if (files.length === 0) {
  console.error('✗ 未找到任何 F4 样式表，守卫无法生效')
  process.exit(1)
}

const allRules = files.flatMap(file => parseRules(readFileSync(join(STYLE_DIR, file), 'utf8'), file))
if (allRules.length === 0) {
  console.error('✗ 样式表解析为空，守卫无法生效')
  process.exit(1)
}

const roots = stageRootSelectors(allRules)
const offenders = allRules
  .filter(rule => !VIEWPORT_LAYER.test(rule.selector))
  .filter(rule => !ALLOWED.some(allowed => rule.selector.includes(allowed)))
  .filter(rule => coversParent(rule.body) && paintsColor(rule.body))
  .filter(rule => isStageWideLayer(rule.selector, roots))
  .map(rule => `${rule.file} → ${rule.selector}`)

// 面板遮罩必须只剩命中区,压暗交给视口层
const home = readFileSync(join(STYLE_DIR, 'home.css'), 'utf8')
const backdrop = parseRules(home, 'home.css').find(rule => rule.selector === '.panel-backdrop-f4')
const stage = readFileSync(join(STYLE_DIR, 'stage.css'), 'utf8')
const structural = []
if (!backdrop) structural.push('home.css 找不到 .panel-backdrop-f4 规则')
else if (!/background:\s*transparent/.test(backdrop.body)) {
  structural.push('.panel-backdrop-f4 又开始自己着色了；压暗必须交给 .f4-bleed::after')
}
if (!/data-dimmed='true'\]\s*\.f4-bleed::after/.test(stage)) {
  structural.push("stage.css 缺少 .f4-viewport[data-dimmed='true'] .f4-bleed::after 压暗层")
}
// backdrop-filter 叠加 opacity:0 会被跳过合成,过渡卡住导致遮罩不出现
if (/\.f4-bleed::after\s*\{[^}]*opacity:\s*0/.test(stage)) {
  structural.push('.f4-bleed::after 不得用 opacity:0 起始（backdrop-filter 下过渡会卡住）')
}

if (offenders.length > 0 || structural.length > 0) {
  console.error('\n✗ 全屏视觉层守卫未通过\n')
  if (offenders.length > 0) {
    console.error('以下规则在舞台内铺满并着色，设备宽高比与 1194×834 不一致时会在 letterbox 处露出矩形边：')
    for (const line of offenders) console.error(`  - ${line}`)
    console.error('\n修法：把着色移到 .f4-bleed（必要时用 .f4-viewport 上的 data-* 开关），舞台内只保留命中区。')
  }
  for (const line of structural) console.error(`  - ${line}`)
  console.error('')
  process.exit(1)
}

console.log(`✓ 全屏视觉层守卫通过（扫描 ${files.length} 个样式表 / ${allRules.length} 条规则）`)
