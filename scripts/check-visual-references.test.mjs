import { describe, expect, it } from 'vitest'
import { NON_VISUAL_MARKER, parseTaskVisualReferences, validateTaskVisualReferences } from './check-visual-references.mjs'

const rootDir = process.cwd()
const task = visualReferences => `# fixture

\`\`\`yaml
task_id: TEST
visual_references:${visualReferences}
forbidden_actions: []
\`\`\`
`

const validCharacterVariant = `
  asset_kind: character_variant
  identity_reference:
    - design-samples/assets/chick-f3.png
  style_reference:
    - docs/reference-images/chick-character-style-reference.png
  environment_reference:
    - design-samples/assets/farm-background-f3.png
  composition_reference:
    - design-samples/sticker-f-farm-v4.html
  allowed_changes:
    - 羽毛配色
  must_preserve:
    - F4 家族比例与五官`

describe('视觉引用任务门禁', () => {
  it('显式跳过非视觉任务', () => {
    expect(validateTaskVisualReferences(task(` ${NON_VISUAL_MARKER}`), rootDir))
      .toEqual({ errors: [], skipped: true })
  })

  it('接受引用真实存在且职责正确的角色变体任务', () => {
    expect(validateTaskVisualReferences(task(validCharacterVariant), rootDir))
      .toEqual({ errors: [], skipped: false })
  })

  it('解析标量、块列表和六个机器可检字段', () => {
    const parsed = parseTaskVisualReferences(task(validCharacterVariant))
    expect(parsed.asset_kind).toBe('character_variant')
    expect(parsed.identity_reference).toEqual(['design-samples/assets/chick-f3.png'])
    expect(parsed.allowed_changes).toEqual(['羽毛配色'])
  })

  it('拒绝角色任务缺少身份锚图', () => {
    const input = validCharacterVariant.replace(
      '  identity_reference:\n    - design-samples/assets/chick-f3.png',
      '  identity_reference: []',
    )
    expect(validateTaskVisualReferences(task(input), rootDir).errors)
      .toContain('角色类资产必须提供 identity_reference')
  })

  it('拒绝把背景或场景总览放进角色身份/画风槽', () => {
    const input = validCharacterVariant
      .replace('design-samples/assets/chick-f3.png', 'design-samples/assets/farm-background-f3.png')
      .replace('docs/reference-images/chick-character-style-reference.png', 'scene-02-orchard-overview.png')
    const errors = validateTaskVisualReferences(task(input), rootDir).errors
    expect(errors.some(error => error.startsWith('identity_reference 不得使用背景'))).toBe(true)
    expect(errors.some(error => error.startsWith('style_reference 不得使用背景'))).toBe(true)
  })

  it('允许背景任务把背景锚图放在环境槽而不是画风槽', () => {
    const input = `
  asset_kind: background
  identity_reference: []
  style_reference: []
  environment_reference:
    - design-samples/assets/farm-background-f3.png
  composition_reference:
    - docs/reference-images/pwa-icon-farm-master.png
  allowed_changes: []
  must_preserve:
    - F4 环境色温与连续空间`
    expect(validateTaskVisualReferences(task(input), rootDir))
      .toEqual({ errors: [], skipped: false })
  })

  it('拒绝变体任务省略允许变化', () => {
    const input = validCharacterVariant.replace('  allowed_changes:\n    - 羽毛配色', '  allowed_changes: []')
    expect(validateTaskVisualReferences(task(input), rootDir).errors)
      .toContain('character_variant 必须提供非空 allowed_changes')
  })

  it('拒绝任一引用路径不存在', () => {
    const input = validCharacterVariant.replace(
      'docs/reference-images/chick-character-style-reference.png',
      'docs/reference-images/does-not-exist.png',
    )
    expect(validateTaskVisualReferences(task(input), rootDir).errors)
      .toContain('style_reference 引用文件不存在：docs/reference-images/does-not-exist.png')
  })

  it('拒绝含糊的非视觉标量', () => {
    expect(validateTaskVisualReferences(task(' documentation_only'), rootDir).errors)
      .toEqual([`visual_references 标量只允许 ${NON_VISUAL_MARKER}`])
  })
})
