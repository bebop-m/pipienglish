import { existsSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const NON_VISUAL_MARKER = 'not_applicable_non_visual_task'

const ASSET_KINDS = new Set(['character', 'character_variant', 'background', 'prop', 'ui'])
const LIST_FIELDS = [
  'identity_reference',
  'style_reference',
  'environment_reference',
  'composition_reference',
  'allowed_changes',
  'must_preserve',
]
const ROLE_LEAK = /(?:^|[\\/_-])(?:background|overview|screenshot)(?:[\\/_.-]|$)|scene-\d{2}-.*background/i

const unquote = value => {
  const text = value.trim()
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1)
  }
  return text
}

function values(value) {
  const text = value.trim()
  if (!text || text === '[]') return []
  if (text.startsWith('[') && text.endsWith(']')) {
    return text.slice(1, -1).split(',').map(unquote).filter(Boolean)
  }
  return [unquote(text)]
}

export function parseTaskVisualReferences(markdown) {
  const fenced = markdown.match(/```ya?ml\s*\r?\n([\s\S]*?)```/i)
  if (!fenced) throw new Error('CURRENT_TASK.md 找不到首个 YAML 门禁块')

  const lines = fenced[1].split(/\r?\n/)
  const start = lines.findIndex(line => /^visual_references:\s*/.test(line))
  if (start < 0) throw new Error('YAML 门禁块缺少 visual_references')

  const scalar = lines[start].replace(/^visual_references:\s*/, '').trim()
  if (scalar) return { mode: 'scalar', value: unquote(scalar) }

  const result = { mode: 'mapping' }
  let current
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break
    if (!line.trim() || /^\s*#/.test(line)) continue

    const field = line.match(/^  ([a-z_]+):\s*(.*)$/)
    if (field) {
      current = field[1]
      result[current] = current === 'asset_kind' ? unquote(field[2]) : values(field[2])
      continue
    }

    const item = line.match(/^    -\s+(.+)$/)
    if (item && current && Array.isArray(result[current])) result[current].push(unquote(item[1]))
  }
  return result
}

export function validateTaskVisualReferences(markdown, rootDir) {
  let config
  try {
    config = parseTaskVisualReferences(markdown)
  } catch (error) {
    return { errors: [error.message], skipped: false }
  }

  if (config.mode === 'scalar') {
    if (config.value === NON_VISUAL_MARKER) return { errors: [], skipped: true }
    return { errors: [`visual_references 标量只允许 ${NON_VISUAL_MARKER}`], skipped: false }
  }

  const errors = []
  if (!ASSET_KINDS.has(config.asset_kind)) {
    errors.push(`asset_kind 必须是 ${[...ASSET_KINDS].join(' / ')}`)
  }
  for (const field of LIST_FIELDS) {
    if (!Array.isArray(config[field])) errors.push(`visual_references 缺少列表字段 ${field}`)
  }
  if (errors.length > 0) return { errors, skipped: false }

  const character = config.asset_kind === 'character' || config.asset_kind === 'character_variant'
  if (character && config.identity_reference.length === 0) errors.push('角色类资产必须提供 identity_reference')
  if (character && config.style_reference.length === 0) errors.push('角色类资产必须提供 style_reference')
  if (config.asset_kind === 'character_variant' && config.allowed_changes.length === 0) {
    errors.push('character_variant 必须提供非空 allowed_changes')
  }
  if (config.must_preserve.length === 0) errors.push('视觉任务必须提供非空 must_preserve')

  for (const [field, refs] of [['identity_reference', config.identity_reference], ['style_reference', config.style_reference]]) {
    for (const ref of refs) {
      if (ROLE_LEAK.test(ref)) errors.push(`${field} 不得使用背景、场景总览或截图：${ref}`)
    }
  }

  for (const field of LIST_FIELDS.slice(0, 4)) {
    for (const ref of config[field]) {
      const path = isAbsolute(ref) ? ref : resolve(rootDir, ref)
      if (!existsSync(path) || !statSync(path).isFile()) errors.push(`${field} 引用文件不存在：${ref}`)
    }
  }

  return { errors, skipped: false }
}

function runCli() {
  const rootDir = process.cwd()
  const taskPath = resolve(rootDir, process.argv[2] ?? 'docs/00-start/CURRENT_TASK.md')
  if (!existsSync(taskPath)) {
    console.error(`✗ 视觉引用门禁找不到任务文件：${taskPath}`)
    process.exitCode = 1
    return
  }

  const result = validateTaskVisualReferences(readFileSync(taskPath, 'utf8'), rootDir)
  if (result.errors.length > 0) {
    console.error('\n✗ 视觉引用门禁未通过\n')
    for (const error of result.errors) console.error(`  - ${error}`)
    console.error('')
    process.exitCode = 1
    return
  }
  console.log(result.skipped ? '✓ 非视觉任务：视觉引用门禁显式跳过' : '✓ 视觉引用门禁通过')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) runCli()
