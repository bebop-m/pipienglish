---
change_id: F4-CHG-009
date: 2026-07-17
stage: H-1B
affected_state: lesson_intro_without_image
production_behavior_change: none
candidate_source:
  - design-samples/stage-h/intro-no-image-candidate.html
  - design-samples/stage-h/intro-no-image-candidate.css
visual_after: visual-regression/stage-h-candidates/H1B-intro-because-v4-1194x834.png
assets:
  - public/assets/f4/mother-f3.png
  - public/assets/f4/farm-background-f3.png
approval: xiaopi-approved
approved_on: 2026-07-17
---

# H-1B 无图听看卡视觉候选

本候选验证没有 `imageAssetId` 时的完整文字优先版式。示例使用功能词 `because`，不显示图片区、空白占位、破图、emoji 或与词义无关的装饰插图。

2026-07-17 V2：例句改为整卡可点击并显示“读句子”；正式实现调用现有 `speak(sentence)`，不增加录音文件、服务端请求或词库必填字段。

2026-07-17 V3：删除卡片顶端黄色图钉；例句卡移除“读句子”文字，只保留右侧垂直居中的圆形音频图标，整卡继续可点击。

2026-07-17 V4：移除音频图标外围圆框、底色与阴影，仅保留右侧垂直居中的音频波形。

2026-07-17：小皮确认 V4 没问题，状态改为 `xiaopi-approved`；生产接入见 F4-CHG-010。
