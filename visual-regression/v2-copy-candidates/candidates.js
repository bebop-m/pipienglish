const STAGE_WIDTH = 1194
const STAGE_HEIGHT = 834

const params = new URLSearchParams(window.location.search)
const variant = ['a', 'b', 'c'].includes(params.get('candidate')) ? params.get('candidate') : 'a'
const stress = params.get('stress') === '1'
const noReviews = params.get('reviews') === '0'

const data = noReviews
  ? {
      dayNumber: 7,
      learnedToday: 0,
      dailyTarget: 4,
      reviewCountToday: 0,
      totalItemsToday: 4,
      estimatedMinutes: 4,
      eggsToEarn: 1,
      streak: 7,
      eggStock: 3,
      chicksTotal: 18,
      incubating: 1,
    }
  : stress
  ? {
      dayNumber: 999,
      learnedToday: 0,
      dailyTarget: 4,
      reviewCountToday: 25,
      totalItemsToday: 29,
      estimatedMinutes: 13,
      eggsToEarn: 2,
      streak: 365,
      eggStock: 128,
      chicksTotal: 9999,
      incubating: 3,
    }
  : {
      dayNumber: 6,
      learnedToday: 0,
      dailyTarget: 4,
      reviewCountToday: 12,
      totalItemsToday: 16,
      estimatedMinutes: 10,
      eggsToEarn: 2,
      streak: 6,
      eggStock: 3,
      chicksTotal: 18,
      incubating: 1,
    }

const candidates = {
  a: {
    label: 'V-2 候选 A · 清楚直接（推荐）',
    copy: noReviews
      ? `认识 ${data.dailyTarget} 个新朋友，完成后母鸡妈妈会下蛋哦。`
      : `先和 ${data.reviewCountToday} 个老朋友打个招呼，再认识 ${data.dailyTarget} 个新朋友。`,
    progressLabel: '今日进度',
    progress: `${data.learnedToday} / ${data.totalItemsToday}`,
    primary: '开始今天的单词！',
  },
  b: {
    label: 'V-2 候选 B · 温暖邀约',
    copy: noReviews
      ? `认识 ${data.dailyTarget} 个新朋友，完成后母鸡妈妈会下蛋哦。`
      : `${data.reviewCountToday} 个老朋友想你了！打完招呼再认识 ${data.dailyTarget} 个新朋友。`,
    progressLabel: '今日进度',
    progress: `${data.learnedToday} / ${data.totalItemsToday}`,
    primary: '开始学习！',
  },
  c: {
    label: 'V-2 候选 C · 轻量数字',
    copy: noReviews
      ? `认识 ${data.dailyTarget} 个新朋友，完成后母鸡妈妈会下蛋哦。`
      : `先和 ${data.reviewCountToday} 个老朋友打个招呼，再认识 ${data.dailyTarget} 个新朋友。`,
    progressLabel: '新朋友进度',
    progress: `${data.learnedToday} / ${data.dailyTarget}`,
    primary: '开始今天的单词！',
  },
}

const selected = candidates[variant]
const stage = document.querySelector('.candidate-stage')

stage.dataset.variant = variant
stage.querySelector('[data-today]').textContent = `${data.learnedToday} / ${data.dailyTarget}`
stage.querySelector('[data-eggs]').textContent = String(data.eggStock)
stage.querySelector('[data-chicks]').textContent = String(data.chicksTotal)
stage.querySelector('[data-incubating]').textContent = String(data.incubating)
stage.querySelector('[data-eyebrow]').textContent = `DAY ${String(data.dayNumber).padStart(2, '0')} · 今日农场任务`
stage.querySelector('[data-copy]').textContent = selected.copy
stage.querySelector('[data-progress-label]').textContent = selected.progressLabel
stage.querySelector('[data-progress]').textContent = selected.progress
stage.querySelector('[data-primary]').textContent = selected.primary
stage.querySelector('[data-minutes]').textContent = `约 ${data.estimatedMinutes} 分钟`
stage.querySelector('[data-reward]').textContent = `🥚 奖励 ×${data.eggsToEarn}`
stage.querySelector('[data-streak]').textContent = `连续第 ${data.streak} 天`
stage.querySelector('[data-candidate-label]').textContent = selected.label
stage.querySelector('[data-progress-fill]').style.width = data.learnedToday === 0
  ? '0%'
  : `${Math.min(100, data.learnedToday / data.totalItemsToday * 100)}%`

function positionStage() {
  const scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT)
  const left = (window.innerWidth - STAGE_WIDTH * scale) / 2
  const top = (window.innerHeight - STAGE_HEIGHT * scale) / 2
  stage.style.setProperty('--candidate-scale', String(scale))
  stage.style.setProperty('--candidate-left', `${left}px`)
  stage.style.setProperty('--candidate-top', `${top}px`)
}

positionStage()
window.addEventListener('resize', positionStage)
