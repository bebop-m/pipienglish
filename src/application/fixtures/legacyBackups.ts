/** 由生产 v0.1/v0.2 JSON 形状裁剪的迁移夹具；字段名与历史导出保持一致。 */
export const V1_REAL_BACKUP = {
  version: 1,
  exportedAt: '2026-07-17T01:00:00.000Z',
  cards: [{
    wordId: 'apple',
    due: 1_721_177_200_000,
    card: {
      due: '2026-07-18T01:00:00.000Z',
      last_review: '2026-07-17T01:00:00.000Z',
      reps: 2,
      lapses: 0,
      stability: 2.4,
      difficulty: 5,
    },
  }],
  sessions: [{
    date: '2026-07-17',
    reviewIds: ['apple'],
    newIds: ['banana'],
    doneCount: 2,
    answered: 2,
    correct: 2,
    completed: true,
  }],
  kv: [
    {
      key: 'farm',
      value: {
        henName: '咕咕',
        chicks: 6,
        pendingEggs: [
          { date: '2026-07-18', n: 2 },
          { date: '2026-07-19', n: 3 },
        ],
      },
    },
    {
      key: 'meta',
      value: {
        streak: 9,
        lastDoneDate: '2026-07-18',
        totalDays: 35,
        installDate: '2026-07-01',
      },
    },
  ],
} as const
export const V2_REAL_BACKUP = {
  version: 2,
  exportedAt: '2026-07-19T01:00:00.000Z',
  cards: [{
    wordId: 'apple',
    due: 1_721_177_200_000,
    card: {
      due: '2026-07-20T01:00:00.000Z',
      last_review: '2026-07-19T01:00:00.000Z',
      reps: 4,
      lapses: 1,
      stability: 3.2,
      difficulty: 4.8,
    },
  }],
  sessions: [{
    date: '2026-07-19',
    reviewIds: ['apple'],
    newIds: ['banana'],
    doneCount: 2,
    answered: 2,
    correct: 1,
    completed: true,
    gameEggs: 4,
  }],
  kv: [
    {
      key: 'farmState',
      value: {
        henName: '咕咕',
        eggStock: 7,
        incubating: [
          { slot: 0, placedAt: 300 },
          { slot: 1, placedAt: 100 },
          { slot: 2, placedAt: 200 },
        ],
        cooking: 'ready',
      },
    },
    {
      key: 'meta',
      value: {
        streak: 12,
        lastDoneDate: '2026-07-19',
        totalDays: 72,
        installDate: '2026-07-01',
      },
    },
    { key: 'settings', value: { motionEnabled: false } },
    { key: 'lesson-progress:2026-07-19', value: { index: 3, phase: 'trace' } },
  ],
  chicks: [
    { chickId: 'legacy-hatch', bornOn: '2026-07-18', source: 'hatch', homeX: 320, homeY: 480 },
    { chickId: 'legacy-migration', bornOn: '2026-07-01', source: 'migration', homeX: null, homeY: null },
  ],
  seen: [{ wordId: 'apple', lastSeenAt: 1_721_177_200_000 }],
  rescue: [{ wordId: 'banana', capturedAt: 1_721_177_210_000, stage: 'trace' }],
  ink: [],
} as const

export const V3_REAL_BACKUP = {
  version: 3,
  exportedAt: '2026-07-19T02:00:00.000Z',
  cards: V2_REAL_BACKUP.cards,
  sessions: V2_REAL_BACKUP.sessions,
  kv: [
    {
      key: 'farmState',
      value: {
        henName: '咕咕',
        eggStock: 23,
        incubating: { placedAt: 500, rarity: 'special', variantId: 'chick-special-scene-2-a' },
        cookingMeal: {
          recipeId: 'picnic_platter',
          eggCost: 5,
          phase: 'ready',
          startedAt: 400,
        },
        activeSceneId: 'scene-2',
        acknowledgedSceneChapter: 2,
        normalHatchStreak: 4,
        nonSpecialHatchStreak: 17,
      },
    },
    V2_REAL_BACKUP.kv[1],
    V2_REAL_BACKUP.kv[2],
    {
      key: 'loadout',
      value: {
        xiaopi: { headLook: 'custom-head', outfit: 'custom-outfit', accessory: 'custom-bag' },
        mother: { headwear: 'custom-flower', neckwear: null },
      },
    },
  ],
  chicks: [{
    chickId: 'v3-special',
    bornOn: '2026-07-19',
    source: 'hatch',
    homeX: 400,
    homeY: 500,
    sceneId: 'scene-2',
    rarity: 'special',
    variantId: 'chick-special-scene-2-a',
    favorite: true,
  }],
  seen: V2_REAL_BACKUP.seen,
  rescue: V2_REAL_BACKUP.rescue,
  ink: [],
  decorations: [{ sceneId: 'scene-2', itemId: 'sticker-flower', x: 240, y: 610 }],
  cosmetics: [{ itemId: 'custom-bag', acquiredAt: 1_721_177_220_000 }],
  sceneMemory: [{ sceneId: 'scene-2', celebrationPhotoCreatedAt: 1_721_177_230_000 }],
} as const
