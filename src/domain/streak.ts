// 连胜规则;补签卡(SPEC §3.3)在 v0.3 引入,规则将只在此文件演进

import type { MetaState } from './types'
import { addDays } from './time'

/** 完成某日必修后的元信息更新;同日重复调用幂等 */
export function completeDay(meta: MetaState, today: string): MetaState {
  if (meta.lastDoneDate === today) return meta
  const yesterday = addDays(today, -1)
  return {
    ...meta,
    streak: meta.lastDoneDate === yesterday ? meta.streak + 1 : 1,
    lastDoneDate: today,
    totalDays: meta.totalDays + 1,
  }
}
