---
change_id: F4-CHG-008
date: 2026-07-17
stage: H-1
affected_state: lesson_intro
production_behavior_change: none
candidate_source:
  - design-samples/stage-h/intro-candidate.html
  - design-samples/stage-h/intro-candidate.css
visual_after: visual-regression/stage-h-candidates/H1-intro-egg-v4-1194x834.png
assets:
  - public/assets/f4/egg-f4-v2.png
  - public/assets/f4/mother-f3.png
  - public/assets/f4/farm-background-f3.png
approval: pending-xiaopi
---

# H-1 听看卡视觉候选

2026-07-17 V2：按爸爸反馈将顶部进度母鸡向左移动 21px，拉开母鸡与进度轨道的距离；移除终点鸡窝，让母鸡直接走到路线尽头。V1 截图保留用于对照。

2026-07-17 V3：例句改为整卡可点击，并加入“读句子”发音提示；生产接入时调用现有 `speak(sentence)`，重复点击沿用先取消上一段语音的规则。

2026-07-17 V4：删除卡片顶端无信息作用的黄色图钉；移除“读句子”文字胶囊，改为例句卡右侧垂直居中的圆形音频图标。整卡仍为触控目标，按下时图标轻微缩小并改变底色。

本候选只回答“第一个新词见面时画面长什么样”，不接真实课程状态。

## 示例真实内容

- 阶段：新朋友，第 1/3 步；今日总进度 3/18。
- 单词：`egg`，音标 `/eɡ/`，中文“鸡蛋”。
- 例句：`The hen laid an egg!` / `母鸡下了一颗蛋！`
- 操作：返回农场、再听一次、点击例句朗读整句、主按钮“我认识它了！”。

## 视觉取舍

- 保留农场世界，但用柔和遮罩让学习卡成为唯一视觉重点。
- 顶部用真实母鸡沿路线向终点前进来表达课程进度，不使用 emoji 或终点鸡窝。
- 卡片使用奶油纸张、粗深棕轮廓和不完全机械对称的圆角；按钮保持至少 52px 触控高度。
- 单词插图暂用已批准的独立鸡蛋资产，不使用词库 emoji。

小皮批准前，本候选不得接入 `src/` 生产页面。
