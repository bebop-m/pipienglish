// 农场背景音乐曲目登记表(2026-07-19 小皮需求:舒缓解压轻快)。
// 与贴纸/装扮同一门控模式:曲目必须经小皮验收(assetStatus='approved')且文件
// 真实存在于 public/assets/f4/audio/ 后才登记为 approved;登记表为空或全为
// internal-placeholder 时,儿童界面不显示音乐开关,播放器保持静默。
// 要求:循环无缝、可商用授权、体积 ≤2MB(离线包体);登记时附来源与授权说明。
//
// 候选曲目由 `node scripts/make-bgm.mjs` 现场合成(原创波形,无采样无版权)。
// 音频文件在小皮选定前不入库,避免未批准素材进离线预缓存;选定后只需
// 把该曲 MP3 放进 public/assets/f4/audio/ 并在下方登记一条 approved。

export interface BgmTrackDefinition {
  id: string
  /** public/assets/f4/audio/ 下的文件名 */
  assetFilename: string
  title: string
  assetStatus: 'approved' | 'internal-placeholder'
}

export const BGM_TRACKS: readonly BgmTrackDefinition[] = []

/** 当前生效曲目:第一首已批准曲目;没有则整个音乐功能对孩子不可见 */
export function approvedBgmTrack(
  tracks: readonly BgmTrackDefinition[] = BGM_TRACKS,
): BgmTrackDefinition | null {
  return tracks.find(track => track.assetStatus === 'approved') ?? null
}
