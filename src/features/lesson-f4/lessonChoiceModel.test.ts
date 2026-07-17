import { describe, expect, it } from 'vitest'
import { judgeLessonChoice, selectedChoiceLabel, type LessonChoiceOption } from './lessonChoiceModel'

const options: LessonChoiceOption[] = [
  { id: 'egg', label: '鸡蛋' },
  { id: 'hen', label: '母鸡' },
]

describe('H-3 中文释义选择题模型', () => {
  it('只用稳定 id 判定正确或重试', () => {
    expect(judgeLessonChoice('egg', 'egg')).toBe('correct')
    expect(judgeLessonChoice('hen', 'egg')).toBe('retry')
  })

  it('反馈只取中文选项文案，未知 id 不伪造内容', () => {
    expect(selectedChoiceLabel(options, 'hen')).toBe('母鸡')
    expect(selectedChoiceLabel(options, null)).toBeNull()
    expect(selectedChoiceLabel(options, 'missing')).toBeNull()
  })
})
